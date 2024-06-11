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

@Component({
    selector: 'app-respuesta-examen',
    templateUrl: './respuesta-examen.component.html',
    styleUrls: ['./respuesta-examen.component.scss'],
})
export class RespuestaExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private trabajoSeleccionadoSubscription: Subscription;

    isLoading: boolean;
    isRespuestaValid: boolean = false;
    editMode: boolean = false;

    role: string[];
    estado: string;

    trabajoDeGradoId: number;
    solicitudId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;

    respuestaForm: FormGroup;

    selectedFiles: { [key: string]: File | string | null } = {};
    evaluacionDocenteIds: number[] = [];
    evaluacionExpertoIds: number[] = [];

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    expertoSeleccionado: Experto;
    docenteSeleccionado: Docente;

    estados: string[] = ['Aprobado', 'Aplazado', 'No Aprobado'];

    constructor(
        private solicitudService: SolicitudService,
        private router: Router,
        private fb: FormBuilder,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private respuestaService: RespuestaService,
        private authService: AuthService,
    ) {}

    get expertoEvaluaciones(): FormArray {
        return this.respuestaForm.get('expertoEvaluaciones') as FormArray;
    }

    get docenteEvaluaciones(): FormArray {
        return this.respuestaForm.get('docenteEvaluaciones') as FormArray;
    }

    ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        this.loadRespuestas();
        this.setBreadcrumb();
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
        this.trabajoSeleccionadoSubscription = this.solicitudService.trabajoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.estado = response.estado;
                    this.respuestaForm
                        .get('idTrabajoGrados')
                        .setValue(response.id);
                    this.trabajoDeGradoId = response.id;
                    this.checkEstados()
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
    }

    setup(fieldName: string) {
        if (this.evaluacionExpertoIds?.length > 0) {
            this.evaluacionExpertoIds.forEach((_: number, index: number) => {
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
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
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
            });
        }

        if (this.evaluacionDocenteIds?.length > 0) {
            this.evaluacionDocenteIds.forEach((_: number, index: number) => {
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
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
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
            case EstadoProceso.EXAMEN_DE_VALORACION_APLAZADO:
            case EstadoProceso.EXAMEN_DE_VALORACION_NO_APROBADO:
                this.isRespuestaValid = false;
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: 'El examen de valoración no está aprobado.'
                });
                break;
            case EstadoProceso.EXAMEN_DE_VALORACION_APROBADO:
                this.isRespuestaValid = true;
                break;
            default:
                this.isRespuestaValid = true;
                break;
        }
    }
    
    initializeForm(respuestas: any) {
        let indexExperto = 0;
        let indexDocente = 0;

        respuestas?.evaluador_externo?.forEach((respuesta) => {
            if (respuesta.tipoEvaluador == 'Externo') {
                this.evaluacionExpertoIds.push(respuesta.idRtaExamenValoracion);
                this.respuestaForm.patchValue({
                    observacion: respuesta.observacion,
                });
                this.respuestaForm.patchValue({
                    estadoFinalizado: respuesta.estadoFinalizado,
                });
                const evaluacionFormGroup = this.fb.group({
                    ['id']: [
                        respuesta.idRtaExamenValoracion,
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
                this.setup('linkFormatoB');
                this.setup('linkFormatoC');
                this.setup('linkObservaciones');
                indexExperto++;
            }
        });

        respuestas?.evaluador_interno?.forEach((respuesta) => {
            if (respuesta.tipoEvaluador == 'Interno') {
                this.evaluacionDocenteIds.push(respuesta.idRtaExamenValoracion);
                this.respuestaForm.patchValue({
                    observacion: respuesta.observacion,
                });
                this.respuestaForm.patchValue({
                    estadoFinalizado: respuesta.estadoFinalizado,
                });
                const evaluacionFormGroup = this.fb.group({
                    ['id']: [
                        respuesta.idRtaExamenValoracion,
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
                this.setup('linkFormatoB');
                this.setup('linkFormatoC');
                this.setup('linkObservaciones');
                indexDocente++;
            }
        });
    }

    initializeFormFromResponse(response: any[]) {
        this.expertoEvaluaciones.clear();
        this.docenteEvaluaciones.clear();
        this.initializeForm(response);
    }

    isExamenCreado(formArrayName: string, index: number): boolean {
        let evaluacion;
        if (formArrayName === 'expertoEvaluaciones') {
            evaluacion = this[formArrayName].at(index);
            return this.evaluacionExpertoIds.includes(evaluacion.value.id);
        }
        if (formArrayName === 'docenteEvaluaciones') {
            evaluacion = this[formArrayName].at(index);
            return this.evaluacionDocenteIds.includes(evaluacion.value.id);
        }
        return false;
    }

    showObservacion(): boolean {
        if (this.docenteEvaluaciones.length > 0) {
            const index = this.docenteEvaluaciones.length - 1;
            const docenteValue = this.docenteEvaluaciones.at(index).get('respuestaExamenValoracionDocente' + index)?.value;    
            return ['Aplazado', 'No Aprobado'].includes(docenteValue);
        }
        if (this.expertoEvaluaciones.length > 0) {
            const index = this.expertoEvaluaciones.length - 1;
            const expertoValue = this.expertoEvaluaciones.at(index).get('respuestaExamenValoracionExperto' + index)?.value;
            return ['Aplazado', 'No Aprobado'].includes(expertoValue);
        }
        return false;
    }

    loadRespuestas() {
        this.isLoading = true;
        this.evaluacionExpertoIds = [];
        this.evaluacionDocenteIds = [];
        this.respuestaService
            .getRespuestasExamen(this.trabajoDeGradoId)
            .subscribe({
                next: (response) => {
                    this.initializeFormFromResponse(response);
                },
                error: (e) => {
                    this.handlerResponseException(e);
                },
                complete: () => {
                    this.isLoading = false;
                },
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
            tipoEvaluador: evaluacion['tipoEvaluador' + i],
            idEvaluador: evaluacion['idEvaluador' + i],
            respuestaExamenValoracion:
                formArrayName === 'expertoEvaluaciones'
                    ? evaluacion['respuestaExamenValoracionExperto' + i]
                    : evaluacion['respuestaExamenValoracionDocente' + i],
            fechaMaximaEntrega: evaluacion['fechaMaximaEntrega' + i],
        };
    }

    updateRespuestaExamen(formArrayName: string, index: number) {
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

        const { [formArrayName]: omit, ...rest } = this.respuestaForm.value;
        const castBit = {
            ...rest,
            estadoFinalizado: Number(rest.estadoFinalizado),
        };
        this.respuestaService
            .updateRespuestaExamen(respuestaId, {
                ...castBit,
                ...evaluacionData,
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
                                id: response.idRtaExamenValoracion,
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

    createRespuestaExamen(formArrayName: string, index: number) {
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

        const { [formArrayName]: omit, ...rest } = this.respuestaForm.value;
        const castBit = {
            ...rest,
            estadoFinalizado: Number(rest.estadoFinalizado),
        };
        this.respuestaService
            .createRespuestaExamen({
                ...castBit,
                ...evaluacionData,
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
                                id: response.idRtaExamenValoracion,
                            });
                        this.messageService.add(
                            infoMessage(
                                Aviso.RESPUESTA_GUARDADA_CORRECTAMENTE
                            )
                        );
                    }
                },
                error: (e) => {
                    this.handlerResponseException(e);
                },
                complete: () => {
                    if (this.isExamenCreado("expertoEvaluaciones", 0) &&
                    this.isExamenCreado("docenteEvaluaciones", 0)) {
                        this.router.navigate(['examen-de-valoracion']);
                    }
                    this.loadRespuestas();
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

    getFileAndSetValue(formArrayName: string, filename: string, index: number) {
        this.solicitudService
            .getFile(
                this[formArrayName].at(index).get(`${filename}${index}`).value
            )
            .subscribe({
                next: (response: string) => {
                    const rutaArchivo = this[formArrayName]
                        .at(index)
                        .get(`${filename}${index}`).value;
                    const byteCharacters = atob(response);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray]);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const extension = rutaArchivo.slice(
                        rutaArchivo.lastIndexOf('.') + 1
                    );
                    document.body.appendChild(a);
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename + `.${extension}`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                },
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
