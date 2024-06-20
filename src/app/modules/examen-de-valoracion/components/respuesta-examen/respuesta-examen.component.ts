import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Aviso, EstadoProceso, Mensaje } from 'src/app/core/enums/enums';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { RespuestaService } from '../../services/respuesta.service';
import { Experto } from '../../models/experto';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { AuthService } from '../../services/auth.service';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { ResolucionService } from '../../services/resolucion.service';

@Component({
    selector: 'app-respuesta-examen',
    templateUrl: './respuesta-examen.component.html',
    styleUrls: ['./respuesta-examen.component.scss'],
})
export class RespuestaExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();

    private trabajoSeleccionadoSubscription: Subscription;

    editMode: boolean = false;
    isLoading: boolean;
    isRespuestaValid: boolean = false;
    isResolucionValid: boolean = false;

    role: string[];
    estado: string;

    trabajoDeGradoId: number;
    solicitudId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;

    respuestaForm: FormGroup;

    selectedFiles: { [key: string]: File[] | File | string | null } = {};
    evaluacionDocenteIds: number[] = [];
    evaluacionExpertoIds: number[] = [];

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    expertoSeleccionado: Experto;
    docenteSeleccionado: Docente;

    estados: string[] = ['Aprobado', 'Aplazado', 'No Aprobado'];

    private isErrorHandled: boolean = false;

    constructor(
        private solicitudService: SolicitudService,
        private router: Router,
        private fb: FormBuilder,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private respuestaService: RespuestaService,
        private resolucionService: ResolucionService,
        private authService: AuthService
    ) {}

    get expertoEvaluaciones(): FormArray {
        return this.respuestaForm.get('expertoEvaluaciones') as FormArray;
    }

    get docenteEvaluaciones(): FormArray {
        return this.respuestaForm.get('docenteEvaluaciones') as FormArray;
    }

    async ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        this.setBreadcrumb();
        await this.loadRespuestas();
    }

    subscribeToObservers() {
        this.role = this.authService.getRole();

        this.solicitudService.estudianteSeleccionado$.subscribe({
            next: (response) => {
                if (response) {
                    this.estudianteSeleccionado = response;
                } else {
                    this.router.navigate(['examen-de-valoracion']);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.tituloSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.tituloSeleccionado = response;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.trabajoSeleccionadoSubscription =
            this.solicitudService.trabajoSeleccionadoSubject$.subscribe({
                next: (response) => {
                    if (response) {
                        this.estado = response.estado;
                        this.respuestaForm
                            .get('idTrabajoGrados')
                            .setValue(response.id);
                        this.trabajoDeGradoId = response.id;
                        this.checkEstados();
                    } else {
                        this.router.navigate(['examen-de-valoracion']);
                    }
                },
                error: (e) => this.handlerResponseException(e),
            });
        this.solicitudService.resolucionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.resolucionId = response.idGeneracionResolucion;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.sustentacionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.sustentacionId = response.idSustentacionTI;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.evaluadorExternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.expertoSeleccionado = response;
                } else {
                    this.messageService.add(
                        warnMessage('Debes seleccionar un evaluador externo')
                    );
                    this.router.navigate([
                        `examen-de-valoracion/solicitud/editar/${this.trabajoDeGradoId}`,
                    ]);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.evaluadorInternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.docenteSeleccionado = response;
                } else {
                    this.messageService.add(
                        warnMessage('Debes seleccionar un evaluador interno')
                    );
                    this.router.navigate([
                        `examen-de-valoracion/solicitud/editar/${this.trabajoDeGradoId}`,
                    ]);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.resolucionValid$.subscribe({
            next: (response) => {
                if (response) {
                    this.isResolucionValid = response;
                } else {
                    this.resolucionService
                        .getResolucionCoordinadorFase3(this.trabajoDeGradoId)
                        .subscribe({
                            next: (response) => {
                                if (
                                    response?.numeroActaConsejoFacultad &&
                                    response?.fechaActaConsejoFacultad
                                ) {
                                    this.isResolucionValid = true;
                                }
                            },
                            error: (e) => {
                                this.handlerResponseException(e);
                            },
                        });
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    setup(fieldName: string, formGroup: string) {
        const agregarArchivo = (file: File, key: string) => {
            if (!Array.isArray(this.selectedFiles[key])) {
                this.selectedFiles[key] = [];
            }
            const archivosExistentes = this.selectedFiles[key] as File[];
            archivosExistentes.push(file);
        };

        if (
            this.evaluacionExpertoIds?.length > 0 &&
            formGroup == 'expertoEvaluaciones'
        ) {
            this.evaluacionExpertoIds.forEach((_: number, index: number) => {
                if (fieldName == 'anexos') {
                    const fileString = this.expertoEvaluaciones
                        ?.at(index)
                        ?.get(`${fieldName}${index}`).value;
                    for (let anexo of fileString) {
                        this.solicitudService
                            .getFile(anexo.linkAnexo)
                            .subscribe({
                                next: (response: any) => {
                                    if (response) {
                                        const byteCharacters = atob(response);
                                        const byteNumbers = new Array(
                                            byteCharacters.length
                                        );
                                        for (
                                            let i = 0;
                                            i < byteCharacters.length;
                                            i++
                                        ) {
                                            byteNumbers[i] =
                                                byteCharacters.charCodeAt(i);
                                        }
                                        const byteArray = new Uint8Array(
                                            byteNumbers
                                        );
                                        const file = new File(
                                            [byteArray],
                                            fieldName,
                                            { type: response.type }
                                        );

                                        agregarArchivo(
                                            file,
                                            `expertoEvaluaciones.${
                                                fieldName + index
                                            }`
                                        );
                                    }
                                },
                                error: (e) => this.handlerResponseException(e),
                            });
                    }
                } else {
                    const fileString = this.expertoEvaluaciones
                        ?.at(index)
                        ?.get(`${fieldName}${index}`).value;
                    this.respuestaService.getFile(fileString).subscribe({
                        next: (response: any) => {
                            if (response) {
                                const byteCharacters = atob(response);
                                const byteNumbers = new Array(
                                    byteCharacters.length
                                );
                                for (
                                    let i = 0;
                                    i < byteCharacters.length;
                                    i++
                                ) {
                                    byteNumbers[i] =
                                        byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const file = new File([byteArray], fieldName, {
                                    type: response.type,
                                });

                                this.selectedFiles[
                                    `expertoEvaluaciones.${fieldName + index}`
                                ] = file;
                            }
                        },
                        error: (e) => this.handlerResponseException(e),
                    });
                }
            });
        }

        if (
            this.evaluacionDocenteIds?.length > 0 &&
            formGroup == 'docenteEvaluaciones'
        ) {
            this.evaluacionDocenteIds.forEach((_: number, index: number) => {
                if (fieldName == 'anexos') {
                    const fileString = this.docenteEvaluaciones
                        ?.at(index)
                        ?.get(`${fieldName}${index}`).value;
                    for (let anexo of fileString) {
                        this.solicitudService
                            .getFile(anexo.linkAnexo)
                            .subscribe({
                                next: (response: any) => {
                                    if (response) {
                                        const byteCharacters = atob(response);
                                        const byteNumbers = new Array(
                                            byteCharacters.length
                                        );
                                        for (
                                            let i = 0;
                                            i < byteCharacters.length;
                                            i++
                                        ) {
                                            byteNumbers[i] =
                                                byteCharacters.charCodeAt(i);
                                        }
                                        const byteArray = new Uint8Array(
                                            byteNumbers
                                        );
                                        const file = new File(
                                            [byteArray],
                                            fieldName,
                                            { type: response.type }
                                        );

                                        agregarArchivo(
                                            file,
                                            `docenteEvaluaciones.${
                                                fieldName + index
                                            }`
                                        );
                                    }
                                },
                                error: (e) => this.handlerResponseException(e),
                            });
                    }
                } else {
                    const fileString = this.docenteEvaluaciones
                        ?.at(index)
                        ?.get(`${fieldName}${index}`).value;
                    this.respuestaService.getFile(fileString).subscribe({
                        next: (response: any) => {
                            if (response) {
                                const byteCharacters = atob(response);
                                const byteNumbers = new Array(
                                    byteCharacters.length
                                );
                                for (
                                    let i = 0;
                                    i < byteCharacters.length;
                                    i++
                                ) {
                                    byteNumbers[i] =
                                        byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const file = new File([byteArray], fieldName, {
                                    type: response.type,
                                });

                                this.selectedFiles[
                                    `docenteEvaluaciones.${fieldName + index}`
                                ] = file;
                            }
                        },
                        error: (e) => this.handlerResponseException(e),
                    });
                }
            });
        }
    }

    initForm(): void {
        this.respuestaForm = this.fb.group({
            idTrabajoGrados: [null, Validators.required],
            expertoEvaluaciones: this.fb.array([]),
            docenteEvaluaciones: this.fb.array([]),
            estadoFinalizado: [false, Validators.required],
            observacion: [null],
        });

        this.formReady.emit(this.respuestaForm);
    }

    checkEstados() {
        switch (this.estado) {
            case EstadoProceso.PENDIENTE_RESULTADO_EXAMEN_DE_VALORACION:
            case EstadoProceso.EXAMEN_DE_VALORACION_APLAZADO_EVALUADOR_1 ||
                EstadoProceso.EXAMEN_DE_VALORACION_APLAZADO_EVALUADOR_2:
            case EstadoProceso.EXAMEN_DE_VALORACION_NO_APROBADO_EVALUADOR_1 ||
                EstadoProceso.EXAMEN_DE_VALORACION_NO_APROBADO_EVALUADOR_2:
                this.isRespuestaValid = false;
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: 'El examen de valoración no está aprobado|aplazado.',
                });
                break;
            case EstadoProceso.EXAMEN_DE_VALORACION_APROBADO_EVALUADOR_1:
                this.isRespuestaValid = false;
                this.messageService.add({
                    severity: 'info',
                    summary: 'Advertencia',
                    detail: EstadoProceso.EXAMEN_DE_VALORACION_APROBADO_EVALUADOR_1,
                });
                break;
            case EstadoProceso.EXAMEN_DE_VALORACION_APROBADO_EVALUADOR_2:
                this.isRespuestaValid = true;
                this.solicitudService.setRespuestaValid(this.isRespuestaValid);
                break;
            default:
                this.isRespuestaValid = true;
                this.solicitudService.setRespuestaValid(this.isRespuestaValid);
                break;
        }
    }

    initializeForm(respuestas: any) {
        let indexExperto = 0;
        let indexDocente = 0;

        respuestas?.evaluador_externo?.forEach((respuesta) => {
            if (respuesta.tipoEvaluador == 'Externo') {
                this.evaluacionExpertoIds.push(
                    respuesta.idRespuestaExamenValoracion
                );
                this.respuestaForm.patchValue({
                    observacion: respuesta.observacion,
                });
                this.respuestaForm.patchValue({
                    estadoFinalizado: respuesta.estadoFinalizado,
                });

                const evaluacionFormGroup = this.fb.group({
                    ['id']: [
                        respuesta.idRespuestaExamenValoracion,
                        Validators.required,
                    ],
                    ['linkFormatoB' + indexExperto]: [
                        respuesta.linkFormatoB,
                        Validators.required,
                    ],
                    ['linkFormatoC' + indexExperto]: [
                        respuesta.linkFormatoC,
                        Validators.required,
                    ],
                    ['linkObservaciones' + indexExperto]: [
                        respuesta.linkObservaciones,
                        Validators.required,
                    ],
                    ['anexos' + indexExperto]: [respuesta.anexos],
                    ['idEvaluador' + indexExperto]: [respuesta.idEvaluador],
                    ['tipoEvaluador' + indexExperto]: [respuesta.tipoEvaluador],
                    ['respuestaExamenValoracionExperto' + indexExperto]: [
                        respuesta.respuestaExamenValoracion,
                        Validators.required,
                    ],
                    ['fechaMaximaEntrega' + indexExperto]: [
                        respuesta.fechaMaximaEntrega,
                    ],
                });
                this.expertoEvaluaciones.push(evaluacionFormGroup);
                this.expertoEvaluaciones.at(indexExperto).patchValue({
                    ['fechaMaximaEntrega' + indexExperto]:
                        respuesta?.fechaMaximaEntrega
                            ? new Date(respuesta.fechaMaximaEntrega)
                            : null,
                });
                this.setup('linkFormatoB', 'expertoEvaluaciones');
                this.setup('linkFormatoC', 'expertoEvaluaciones');
                this.setup('linkObservaciones', 'expertoEvaluaciones');
                this.setup('anexos', 'expertoEvaluaciones');
                indexExperto++;
            }
        });

        respuestas?.evaluador_interno?.forEach((respuesta) => {
            if (respuesta.tipoEvaluador == 'Interno') {
                this.evaluacionDocenteIds.push(
                    respuesta.idRespuestaExamenValoracion
                );
                this.respuestaForm.patchValue({
                    observacion: respuesta.observacion,
                });
                this.respuestaForm.patchValue({
                    estadoFinalizado: respuesta.estadoFinalizado,
                });
                const evaluacionFormGroup = this.fb.group({
                    ['id']: [
                        respuesta.idRespuestaExamenValoracion,
                        Validators.required,
                    ],
                    ['linkFormatoB' + indexDocente]: [
                        respuesta.linkFormatoB,
                        Validators.required,
                    ],
                    ['linkFormatoC' + indexDocente]: [
                        respuesta.linkFormatoC,
                        Validators.required,
                    ],
                    ['linkObservaciones' + indexDocente]: [
                        respuesta.linkObservaciones,
                        Validators.required,
                    ],
                    ['anexos' + indexDocente]: [respuesta.anexos],
                    ['idEvaluador' + indexDocente]: [respuesta.idEvaluador],
                    ['tipoEvaluador' + indexDocente]: [respuesta.tipoEvaluador],
                    ['respuestaExamenValoracionDocente' + indexDocente]: [
                        respuesta.respuestaExamenValoracion,
                        Validators.required,
                    ],
                    ['fechaMaximaEntrega' + indexDocente]: [
                        respuesta.fechaMaximaEntrega,
                    ],
                });
                this.docenteEvaluaciones.push(evaluacionFormGroup);
                this.docenteEvaluaciones.at(indexDocente).patchValue({
                    ['fechaMaximaEntrega' + indexDocente]:
                        respuesta?.fechaMaximaEntrega
                            ? new Date(respuesta.fechaMaximaEntrega)
                            : null,
                });
                this.setup('linkFormatoB', 'docenteEvaluaciones');
                this.setup('linkFormatoC', 'docenteEvaluaciones');
                this.setup('linkObservaciones', 'docenteEvaluaciones');
                this.setup('anexos', 'docenteEvaluaciones');
                indexDocente++;
            }
        });
    }

    initializeFormFromResponse(response: any[]) {
        this.expertoEvaluaciones.clear();
        this.docenteEvaluaciones.clear();
        this.initializeForm(response);
    }

    //#region Anexos
    anexosFiles: File[] = [];
    anexosBase64: { linkAnexo: string }[] = [];

    onUpload(event, formArrayName, index) {
        const maxFileSize = 5000000;
        for (let file of event.files) {
            let uniqueId = uuidv4().replace(/-/g, '').slice(0, 4);
            const selectedFile = file;
            if (selectedFile.size > maxFileSize) {
                this.messageService.add(
                    errorMessage(Aviso.ARCHIVO_DEMASIADO_GRANDE)
                );
                return null;
            }
            this.anexosFiles.push(file);
            const fileType = selectedFile.type.split('/')[1];
            this.convertFileToBase64(selectedFile)
                .then((base64) => {
                    this.anexosBase64.push({
                        linkAnexo: `Anexos${uniqueId}.${fileType}-${base64}`,
                    });
                    this.selectedFiles[`${formArrayName}.anexos${index}`] =
                        this.anexosFiles;
                    this[formArrayName]
                        .at(index)
                        .get('anexos' + index)
                        .setValue(this.anexosBase64);
                })
                .catch((error) => {
                    console.error(
                        'Error al convertir el archivo a base64:',
                        error
                    );
                });
        }
    }

    removeFile(formArrayName: string, indexFiles: number, indexAnexos: number) {
        const anexosKey = `${formArrayName}.anexos${indexAnexos}`;
        const anexos = this.selectedFiles[anexosKey];

        if (Array.isArray(anexos)) {
            anexos.splice(indexFiles, 1);
        }

        const anexosField = this[formArrayName]
            .at(indexAnexos)
            .get('anexos' + indexAnexos);
        if (anexosField) {
            let currentAnexos = anexosField.value;
            if (Array.isArray(currentAnexos)) {
                currentAnexos.splice(indexFiles, 1);
                anexosField.setValue(currentAnexos);
            }
        }
    }

    //#endregion

    isExamenCreado(formArrayName: string, index: number): boolean {
        let evaluacion;
        if (formArrayName === 'expertoEvaluaciones') {
            evaluacion = this[formArrayName].at(index);
            return this.evaluacionExpertoIds.includes(evaluacion?.value.id);
        }
        if (formArrayName === 'docenteEvaluaciones') {
            evaluacion = this[formArrayName].at(index);
            return this.evaluacionDocenteIds.includes(evaluacion?.value.id);
        }
        return false;
    }

    showObservacion(): boolean {
        if (this.docenteEvaluaciones.length > 0) {
            const index = this.docenteEvaluaciones.length - 1;
            const docenteValue = this.docenteEvaluaciones
                .at(index)
                .get('respuestaExamenValoracionDocente' + index)?.value;
            return ['Aplazado', 'No Aprobado'].includes(docenteValue);
        }
        if (this.expertoEvaluaciones.length > 0) {
            const index = this.expertoEvaluaciones.length - 1;
            const expertoValue = this.expertoEvaluaciones
                .at(index)
                .get('respuestaExamenValoracionExperto' + index)?.value;
            return ['Aplazado', 'No Aprobado'].includes(expertoValue);
        }
        return false;
    }

    private hasNavigated = false;

    loadRespuestas(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.trabajoDeGradoId) {
                const error = new Error('trabajoDeGradoId is undefined');
                this.handlerResponseException(error);
                return reject(error);
            }

            this.isLoading = true;
            this.evaluacionExpertoIds = [];
            this.evaluacionDocenteIds = [];
            this.selectedFiles = {};
            this.respuestaService
                .getRespuestasExamen(this.trabajoDeGradoId)
                .subscribe({
                    next: (response) => {
                        this.initializeFormFromResponse(response);
                    },
                    error: (e) => {
                        this.handlerResponseException(e);
                        reject(e);
                    },
                    complete: () => {
                        this.isLoading = false;
                        resolve();
                    },
                });
        });
    }

    ngOnDestroy() {
        if (this.trabajoSeleccionadoSubscription) {
            this.trabajoSeleccionadoSubscription.unsubscribe();
        }
    }

    mapEvaluacion(formArrayName: string, index: number) {
        const evaluacion = this[formArrayName].at(index).value;
        const i = index;

        return {
            linkFormatoB: evaluacion['linkFormatoB' + i],
            linkFormatoC: evaluacion['linkFormatoC' + i],
            linkObservaciones: evaluacion['linkObservaciones' + i],
            anexos: evaluacion['anexos' + i],
            tipoEvaluador: evaluacion['tipoEvaluador' + i],
            idEvaluador: evaluacion['idEvaluador' + i],
            respuestaExamenValoracion:
                formArrayName === 'expertoEvaluaciones'
                    ? evaluacion['respuestaExamenValoracionExperto' + i]
                    : evaluacion['respuestaExamenValoracionDocente' + i],
            fechaMaximaEntrega: evaluacion['fechaMaximaEntrega' + i],
        };
    }

    async updateRespuestaExamen(formArrayName: string, index: number) {
        if (this[formArrayName].at(index).invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }
        const respuestaId =
            formArrayName === 'expertoEvaluaciones'
                ? this.evaluacionExpertoIds[index]
                : this.evaluacionDocenteIds[index];
        const evaluacionData = this.mapEvaluacion(formArrayName, index);

        if (evaluacionData.respuestaExamenValoracion == 'Aprobado')
            evaluacionData.fechaMaximaEntrega = '';

        const formatoB = await this.formatFileString(
            this.selectedFiles[`${formArrayName}.${'linkFormatoB' + index}`],
            'linkFormatoB'
        );

        const formatoC = await this.formatFileString(
            this.selectedFiles[`${formArrayName}.${'linkFormatoC' + index}`],
            'linkFormatoC'
        );

        const respuestaMail = {
            informacionEnvioDto: {
                asunto: 'Envio respuesta evaluadores',
                mensaje:
                    'Buenos dias, envio documentos enviados por el evaluador Mage',
                formatoB,
                formatoC,
            },
        };

        const { [formArrayName]: omit, ...rest } = this.respuestaForm.value;
        const castBit = {
            ...rest,
            estadoFinalizado: Number(rest.estadoFinalizado),
        };
        this.respuestaService
            .updateRespuestaExamen(respuestaId, {
                ...castBit,
                ...evaluacionData,
                ...respuestaMail,
            })
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.solicitudService.setRespuestaSeleccionada(
                            response
                        );
                        this[formArrayName]
                            .at(this[formArrayName].length - 1)
                            .patchValue({
                                id: response.idRespuestaExamenValoracion,
                            });
                        this.messageService.add(
                            infoMessage(
                                Aviso.RESPUESTA_ACTUALIZADA_CORRECTAMENTE
                            )
                        );
                    }
                },
                error: (e) => {
                    this.handlerResponseException(e);
                },
                complete: () => {
                    this.loadRespuestas();
                },
            });
    }

    convertFileToBase64(file: File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result as string;
                const base64 = base64String.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }

    async formatFileString(
        file: any,
        fileControlName: string
    ): Promise<string> {
        return this.convertFileToBase64(file)
            .then((base64) => {
                const extension = file.type.split('/')[1];
                return `${fileControlName}.${extension}-${base64}`;
            })
            .catch((error) => {
                console.error('Error al convertir el archivo a base64:', error);
                throw error;
            });
    }

    async createRespuestaExamen(formArrayName: string, index: number) {
        if (this[formArrayName].at(index).invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }
        const evaluacionData = this.mapEvaluacion(formArrayName, index);

        if (evaluacionData.respuestaExamenValoracion == 'Aprobado')
            evaluacionData.fechaMaximaEntrega = '';

        const formatoB = await this.formatFileString(
            this.selectedFiles[`${formArrayName}.${'linkFormatoB' + index}`],
            'linkFormatoB'
        );

        const formatoC = await this.formatFileString(
            this.selectedFiles[`${formArrayName}.${'linkFormatoC' + index}`],
            'linkFormatoC'
        );

        const respuestaMail = {
            informacionEnvioDto: {
                asunto: 'Envio respuesta evaluadores',
                mensaje:
                    'Buenos dias, envio documentos enviados por el evaluador Mage',
                formatoB,
                formatoC,
            },
        };

        const { [formArrayName]: omit, ...rest } = this.respuestaForm.value;
        const castBit = {
            ...rest,
            estadoFinalizado: Number(rest.estadoFinalizado),
        };
        this.respuestaService
            .createRespuestaExamen({
                ...castBit,
                ...evaluacionData,
                ...respuestaMail,
            })
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.solicitudService.setRespuestaSeleccionada(
                            response
                        );
                        this[formArrayName]
                            .at(this[formArrayName].length - 1)
                            .patchValue({
                                id: response.idRespuestaExamenValoracion,
                            });
                        this.messageService.add(
                            infoMessage(Aviso.RESPUESTA_GUARDADA_CORRECTAMENTE)
                        );
                    }
                },
                error: (e) => {
                    this.handlerResponseException(e);
                },
                complete: async () => {
                    await this.loadRespuestas();
                    if (
                        !this.hasNavigated &&
                        this.isExamenCreado('expertoEvaluaciones', 0) &&
                        this.isExamenCreado('docenteEvaluaciones', 0)
                    ) {
                        this.router.navigate(['examen-de-valoracion']);
                        this.hasNavigated = true;
                    }
                },
            });
    }

    agregarEvaluacion(formArrayName: string) {
        if (this[formArrayName].invalid) {
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
        } else {
            const evaluacionId = uuidv4();
            const evaluacion = this.fb.group({
                ['id']: [evaluacionId, Validators.required],
                ['linkFormatoB' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
                ['linkFormatoC' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
                ['linkObservaciones' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
                ['anexos' + this[formArrayName].length]: [null],
                ['tipoEvaluador' + this[formArrayName].length]: [
                    formArrayName === 'expertoEvaluaciones'
                        ? 'Externo'
                        : 'Interno',
                    Validators.required,
                ],
                ['idEvaluador' + this[formArrayName].length]: [
                    formArrayName === 'expertoEvaluaciones'
                        ? this.expertoSeleccionado.id
                        : this.docenteSeleccionado.id,
                    Validators.required,
                ],
                [formArrayName === 'expertoEvaluaciones'
                    ? 'respuestaExamenValoracionExperto' +
                      this[formArrayName].length
                    : 'respuestaExamenValoracionDocente' +
                      this[formArrayName].length]: [null, Validators.required],
                ['fechaMaximaEntrega' + this[formArrayName].length]: [null],
            });
            this[formArrayName].push(evaluacion);
        }
    }

    updateControlNames(formArray: FormArray) {
        formArray.controls.forEach((control, index) => {
            const newControls = {};
            Object.keys(control.value).forEach((key) => {
                const newName = key.replace(/\d+$/, index.toString());
                newControls[newName] = control.get(key);
            });
            formArray.setControl(index, this.fb.group(newControls));
        });
    }

    eliminarRespuestaExamen(formArrayName: string, index: number) {
        const respuestaId =
            formArrayName === 'expertoEvaluaciones'
                ? this.evaluacionExpertoIds[index]
                : this.evaluacionDocenteIds[index];
        const respuestaIndex = this[formArrayName].controls.findIndex(
            (control) => control.get('id').value === respuestaId
        );
        if (respuestaIndex !== -1) {
            this[formArrayName].removeAt(respuestaIndex);
            this.updateControlNames(this[formArrayName]);

            formArrayName == 'expertoEvaluaciones'
                ? this.evaluacionExpertoIds.splice(index, 1)
                : this.evaluacionDocenteIds.splice(index, 1);

            this.respuestaService.deleteRespuestaExamen(respuestaId).subscribe({
                next: () => {
                    this.messageService.add(
                        errorMessage(Aviso.RESPUESTA_ELIMINADA_CORRECTAMENTE)
                    );
                },
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    this.selectedFiles = {};
                    this.loadRespuestas();
                },
            });
        }
    }

    onRemove(arr: any) {
        this.selectedFiles[`${arr[1]}.${arr[0]}`] = null;
    }

    onArchivoSeleccionado(arr: any): void {
        this.selectedFiles[`${arr[2]}.${arr[0]}`] = arr[1];
        if (arr[2] == 'expertoEvaluaciones') {
            let index = arr[0].charAt(arr[0].length - 1);
            this.expertoEvaluaciones.at(index).get(arr[0]).setValue(arr[3]);
        }
        if (arr[2] == 'docenteEvaluaciones') {
            let index = arr[0].charAt(arr[0].length - 1);
            this.docenteEvaluaciones.at(index).get(arr[0]).setValue(arr[3]);
        }
    }

    downloadFile = (
        response: string,
        rutaArchivo: string,
        downloadName: string
    ) => {
        const byteCharacters = atob(response);
        const byteNumbers = new Array(byteCharacters.length)
            .fill(0)
            .map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const extension = rutaArchivo.slice(rutaArchivo.lastIndexOf('.') + 1);

        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `${downloadName}.${extension}`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    getFileAndSetValue(formArrayName: string, filename: string, index: number) {
        if (filename === 'anexos') {
            for (const anexo of this[formArrayName]
                .at(index)
                .get(`${filename}${index}`).value) {
                this.solicitudService.getFile(anexo.linkAnexo).subscribe({
                    next: (response: string) =>
                        this.downloadFile(response, anexo.linkAnexo, filename),
                    error: (response) => {
                        if (response) {
                            this.messageService.add(
                                warnMessage(
                                    'Modifica la informacion para ver los cambios.'
                                )
                            );
                        }
                    },
                });
            }
        } else {
            const rutaArchivo = this[formArrayName]
                .at(index)
                .get(`${filename}${index}`).value;
            this.solicitudService
                .getFile(
                    this[formArrayName].at(index).get(`${filename}${index}`)
                        .value
                )
                .subscribe({
                    next: (response: string) =>
                        this.downloadFile(response, rutaArchivo, filename),
                    error: (response) => {
                        if (response) {
                            this.messageService.add(
                                warnMessage(
                                    'Modifica la informacion para ver los cambios.'
                                )
                            );
                        }
                    },
                });
        }
    }

    redirectToSolicitud(trabajoDeGradoId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${trabajoDeGradoId}`,
        ]);
    }

    redirectToResolucion(resolucionId: number) {
        resolucionId
            ? this.router.navigate([
                  `examen-de-valoracion/resolucion/editar/${resolucionId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/resolucion']);
    }

    redirectToSustentacion(sustentacionId: number) {
        sustentacionId
            ? this.router.navigate([
                  `examen-de-valoracion/sustentacion/editar/${sustentacionId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/sustentacion']);
    }

    redirectToBandeja() {
        this.router.navigate(['examen-de-valoracion']);
    }

    handlerResponseException(response: any) {
        if (response.status != 501) return;
        const mapException = mapResponseException(response.error);
        mapException.forEach((value, _) => {
            this.messageService.add(errorMessage(value));
        });
    }

    isActiveIndex(): Boolean {
        if (this.router.url.includes('respuesta')) {
            return true;
        }
        return false;
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            {
                label: 'Examen de Valoracion',
                routerLink: 'examen-de-valoracion',
            },
            { label: 'Respuesta' },
        ]);
    }
}
