import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Mensaje } from 'src/app/core/enums/enums';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { Evaluacion, Respuesta } from '../../models/respuesta';
import { RespuestaService } from '../../services/respuesta.service';
import { Experto } from '../../models/experto';
import {
    Subject,
    debounceTime,
    distinctUntilChanged,
    switchMap,
    takeUntil,
    timer,
} from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';

@Component({
    selector: 'app-respuesta-examen',
    templateUrl: './respuesta-examen.component.html',
    styleUrls: ['./respuesta-examen.component.scss'],
})
export class RespuestaExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private unsubscribe_respuesta$ = new Subject<void>();
    private unsubscribe_evaluacion_experto$ = new Subject<void>();
    private unsubscribe_evaluacion_docente$ = new Subject<void>();

    isLoading: boolean;
    editMode: boolean = false;

    solicitudId: number;
    respuestaId: number;
    resolucionId: number;

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
        private respuestaService: RespuestaService
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
        if (this.router.url.includes('editar')) {
            this.loadEditMode();
        }
        this.loadData();
        this.setBreadcrumb();
    }

    loadEditMode() {
        this.editMode = true;
        this.loadRespuesta();
    }

    loadData(): void {
        if (!this.editMode) {
            this.isLoading = true;
            this.respuestaService
                .createRespuesta(this.respuestaForm.value)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            console.log(
                                'Datos guardados en el backend-respuesta:',
                                response
                            );
                            this.respuestaId = response.id;
                            this.solicitudService.setRespuestaSeleccionada(
                                response
                            );
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.router.navigate([
                                    'examen-de-valoracion/respuesta/editar',
                                    response.id,
                                ]);
                            });
                        }
                    },
                    error: () => {
                        console.error(
                            'Error al guardar los datos en el backend:'
                        );
                    },
                });
        }
    }

    subscribeToObservers() {
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
        this.solicitudService.solicitudSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.respuestaForm
                        .get('solicitud')
                        .setValue(response.solicitudId);
                    this.solicitudId = response.solicitudId;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.respuestaSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.respuestaId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.resolucionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.resolucionId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.evaluadorExternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.expertoSeleccionado = response;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.evaluadorInternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.docenteSeleccionado = response;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    setup(fieldName: string) {
        if (this.evaluacionExpertoIds?.length > 0) {
            this.evaluacionExpertoIds.forEach(
                (evaluacionId: number, index: number) => {
                    this.solicitudService
                        .getFile(evaluacionId, "evaluacionId", fieldName)
                        .subscribe({
                            next: (response: any) => {
                                if (response) {
                                    const regex =
                                        /evaluacionId=(\d+)&tipoDocumento=(\w+)/;
                                    const match = response.url.match(regex);

                                    if (match) {
                                        const evaluacionId = match[1];
                                        const tipoDocumento = match[2];
                                        const combined = `${evaluacionId}_${tipoDocumento}`;

                                        const file = new File(
                                            [response.body],
                                            combined,
                                            {
                                                type: response.type,
                                            }
                                        );

                                        this.selectedFiles[
                                            `expertoEvaluaciones.${
                                                fieldName + index
                                            }`
                                        ] = file;
                                    }
                                }
                            },
                            error: (e) => this.handlerResponseException(e),
                        });
                }
            );
        }

        if (this.evaluacionDocenteIds?.length > 0) {
            this.evaluacionDocenteIds.forEach(
                (evaluacionId: number, index: number) => {
                    this.solicitudService
                        .getFile(evaluacionId, "evaluacionId", fieldName)
                        .subscribe({
                            next: (response: any) => {
                                if (response) {
                                    const regex =
                                        /evaluacionId=(\d+)&tipoDocumento=(\w+)/;
                                    const match = response.url.match(regex);

                                    if (match) {
                                        const evaluacionId = match[1];
                                        const tipoDocumento = match[2];
                                        const combined = `${evaluacionId}_${tipoDocumento}`;

                                        const file = new File(
                                            [response.body],
                                            combined,
                                            {
                                                type: response.type,
                                            }
                                        );

                                        this.selectedFiles[
                                            `docenteEvaluaciones.${
                                                fieldName + index
                                            }`
                                        ] = file;
                                    }
                                }
                            },
                            error: (e) => this.handlerResponseException(e),
                        });
                }
            );
        }
    }

    initForm(): void {
        this.respuestaForm = this.fb.group({
            titulo: [null, Validators.required],
            solicitud: [null, Validators.required],
            expertoEvaluaciones: this.fb.array([]),
            docenteEvaluaciones: this.fb.array([]),
            fecha_correcciones: [null, Validators.required],
        });

        this.formReady.emit(this.respuestaForm);
    }

    setValuesForm(respuesta: Respuesta) {
        this.respuestaForm.patchValue({
            ...respuesta,
        });
    }

    initializeForm(evaluaciones: Evaluacion[]) {
        let indexExperto = 0;
        let indexDocente = 0;

        evaluaciones.forEach((evaluacion) => {
            if (evaluacion.experto !== null) {
                this.evaluacionExpertoIds.push(evaluacion.id);
                const evaluacionFormGroup = this.fb.group({
                    ['id']: [evaluacion.id, Validators.required],
                    ['docFormatoB' + indexExperto]: [
                        evaluacion.docFormatoB,
                        Validators.required,
                    ],
                    ['experto' + indexExperto]: [evaluacion.experto],
                    ['docente' + indexExperto]: [evaluacion.docente],
                    ['docFormatoC' + indexExperto]: [
                        evaluacion.docFormatoC,
                        Validators.required,
                    ],
                    ['docObservaciones' + indexExperto]: [
                        evaluacion.docObservaciones,
                        Validators.required,
                    ],
                    ['estadoRespuestaExperto' + indexExperto]: [
                        evaluacion.estadoRespuesta,
                        Validators.required,
                    ],
                    ['fechaCorrecciones' + indexExperto]: [
                        evaluacion.fechaCorrecciones,
                    ],
                });
                this.expertoEvaluaciones.push(evaluacionFormGroup);
                this.setup('docFormatoB');
                this.setup('docFormatoC');
                this.setup('docObservaciones');
                this.expertoEvaluaciones
                    .at(indexExperto)
                    .get(`fechaCorrecciones${indexExperto}`)
                    .setValue(
                        evaluacion?.fechaCorrecciones
                            ? new Date(evaluacion.fechaCorrecciones)
                            : null
                    );
                indexExperto++;
            }

            if (evaluacion.docente !== null) {
                this.evaluacionDocenteIds.push(evaluacion.id);
                const evaluacionFormGroup = this.fb.group({
                    ['id']: [evaluacion.id, Validators.required],
                    ['docFormatoB' + indexDocente]: [
                        evaluacion.docFormatoB,
                        Validators.required,
                    ],
                    ['experto' + indexDocente]: [evaluacion.experto],
                    ['docente' + indexDocente]: [evaluacion.docente],
                    ['docFormatoC' + indexDocente]: [
                        evaluacion.docFormatoC,
                        Validators.required,
                    ],
                    ['docObservaciones' + indexDocente]: [
                        evaluacion.docObservaciones,
                        Validators.required,
                    ],
                    ['estadoRespuestaDocente' + indexDocente]: [
                        evaluacion.estadoRespuesta,
                        Validators.required,
                    ],
                    ['fechaCorrecciones' + indexDocente]: [
                        evaluacion.fechaCorrecciones,
                    ],
                });
                this.docenteEvaluaciones.push(evaluacionFormGroup);
                this.setup('docFormatoB');
                this.setup('docFormatoC');
                this.setup('docObservaciones');
                this.docenteEvaluaciones
                    .at(indexDocente)
                    .get(`fechaCorrecciones${indexDocente}`)
                    .setValue(
                        evaluacion?.fechaCorrecciones
                            ? new Date(evaluacion.fechaCorrecciones)
                            : null
                    );
                indexDocente++;
            }
        });
    }

    initializeFormFromResponse(response: Evaluacion[]) {
        this.expertoEvaluaciones.clear();
        this.docenteEvaluaciones.clear();
        this.initializeForm(response);
    }

    loadRespuesta() {
        this.respuestaService
            .getRespuestaBySolicitud(this.solicitudId)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.setValuesForm(response);
                        this.respuestaForm
                            .get('titulo')
                            .setValue(this.tituloSeleccionado);
                    }
                },
            });
        this.respuestaService.getEvaluaciones(this.respuestaId).subscribe({
            next: (response) => {
                this.initializeFormFromResponse(response);
            },
            error: (e) => {
                this.handlerResponseException(e);
            },
        });
        this.respuestaForm.valueChanges
            .pipe(
                debounceTime(300), // Espera 300ms después de la última pulsación de tecla
                distinctUntilChanged(), // Solo emite si los valores son diferentes
                takeUntil(this.unsubscribe_respuesta$),
                switchMap(() =>
                    this.respuestaService.updateRespuesta(
                        this.respuestaForm.value,
                        this.solicitudId
                    )
                )
            )
            .subscribe({
                next: (response) => {
                    if (response) {
                        console.log(
                            'Datos actualizados en el backend: respuesta',
                            response
                        );
                    }
                },
                error: () => {
                    console.error(
                        'Error al actualizar los datos en el backend:'
                    );
                },
            });

        this.expertoEvaluaciones.valueChanges
            .pipe(
                debounceTime(300), // Espera 300ms después de la última pulsación de tecla
                distinctUntilChanged(), // Solo emite si los valores son diferentes
                takeUntil(this.unsubscribe_evaluacion_experto$)
            )
            .subscribe((evaluaciones) => {
                evaluaciones.forEach((_, index: number) => {
                    const evaluacionId = this.evaluacionExpertoIds[index];
                    const evaluacion = this.expertoEvaluaciones.controls.find(
                        (evaluacion) =>
                            evaluacion.get('id').value === evaluacionId
                    ).value;

                    const updateEvaluacion: Evaluacion = {
                        estadoRespuesta:
                            evaluacion['estadoRespuestaExperto' + index],
                        fechaCorrecciones:
                            evaluacion['fechaCorrecciones' + index],
                    };

                    this.respuestaService
                        .updateEvaluacion(updateEvaluacion, evaluacionId)
                        .subscribe({
                            next: (response) => {
                                if (response) {
                                    console.log(
                                        'Datos actualizados en el backend: evaluacion',
                                        response
                                    );
                                }
                            },
                            error: () => {
                                console.error(
                                    'Error al actualizar los datos en el backend:'
                                );
                            },
                        });
                });
            });

        this.docenteEvaluaciones.valueChanges
            .pipe(
                debounceTime(300), // Espera 300ms después de la última pulsación de tecla
                distinctUntilChanged(), // Solo emite si los valores son diferentes
                takeUntil(this.unsubscribe_evaluacion_docente$)
            )
            .subscribe((evaluaciones) => {
                evaluaciones.forEach((_, index: number) => {
                    const evaluacionId = this.evaluacionDocenteIds[index];
                    const evaluacion = this.docenteEvaluaciones.controls.find(
                        (evaluacion) =>
                            evaluacion.get('id').value === evaluacionId
                    ).value;

                    const updateEvaluacion: Evaluacion = {
                        estadoRespuesta:
                            evaluacion['estadoRespuestaDocente' + index],
                        fechaCorrecciones:
                            evaluacion['fechaCorrecciones' + index],
                    };

                    this.respuestaService
                        .updateEvaluacion(updateEvaluacion, evaluacionId)
                        .subscribe({
                            next: (response) => {
                                if (response) {
                                    console.log(
                                        'Datos actualizados en el backend: evaluacion',
                                        response
                                    );
                                }
                            },
                            error: () => {
                                console.error(
                                    'Error al actualizar los datos en el backend:'
                                );
                            },
                        });
                });
            });
    }

    ngOnDestroy() {
        this.unsubscribe_respuesta$.next();
        this.unsubscribe_respuesta$.complete();

        this.unsubscribe_evaluacion_experto$.next();
        this.unsubscribe_evaluacion_experto$.complete();

        this.unsubscribe_evaluacion_docente$.next();
        this.unsubscribe_evaluacion_docente$.complete();
    }

    mapEvaluacion(formArrayName: string) {
        return this[formArrayName].value.map(
            (evaluacion: Evaluacion, i: number) => ({
                docFormatoB: evaluacion['docFormatoB' + i],
                docFormatoC: evaluacion['docFormatoC' + i],
                docente: evaluacion['docente' + i],
                experto: evaluacion['experto' + i],
                docObservaciones: evaluacion['docObservaciones' + i],
                estadoRespuesta:
                    formArrayName === 'expertoEvaluaciones'
                        ? evaluacion['estadoRespuestaExperto' + i]
                        : evaluacion['estadoRespuestaDocente' + i],
                fechaCorrecciones: evaluacion['fechaCorrecciones' + i],
            })
        );
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
                ['docFormatoB' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
                [formArrayName === 'expertoEvaluaciones'
                    ? 'experto' + this[formArrayName].length
                    : 'docente' + this[formArrayName].length]:
                    formArrayName === 'expertoEvaluaciones'
                        ? [this.expertoSeleccionado.id, Validators.required]
                        : [this.docenteSeleccionado.id, Validators.required],
                ['docFormatoC' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
                ['docObservaciones' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
                [formArrayName === 'expertoEvaluaciones'
                    ? 'estadoRespuestaExperto' + this[formArrayName].length
                    : 'estadoRespuestaDocente' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
                ['fechaCorrecciones' + this[formArrayName].length]: [
                    null,
                    Validators.required,
                ],
            });
            this[formArrayName].push(evaluacion);
            const evaluacionesData = this.mapEvaluacion(formArrayName);
            this.respuestaService
                .createEvaluacion(
                    evaluacionesData[this[formArrayName].length - 1],
                    this.respuestaId
                )
                .subscribe({
                    next: (response) => {
                        if (response) {
                            formArrayName == 'expertoEvaluaciones'
                                ? this.evaluacionExpertoIds.push(response.id)
                                : this.evaluacionDocenteIds.push(response.id);
                            evaluacion.patchValue({ id: response.id });
                            this.messageService.add(
                                infoMessage(Mensaje.REGISTRO_EVALUACION_EXITOSO)
                            );
                        }
                    },
                    error: (e) => {
                        this.handlerResponseException(e);
                    },
                });
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

    eliminarEvaluacion(formArrayName: string, index: number) {
        const evaluacionId =
            formArrayName === 'expertoEvaluaciones'
                ? this.evaluacionExpertoIds[index]
                : this.evaluacionDocenteIds[index];

        const evaluacionIndex = this[formArrayName].controls.findIndex(
            (control) => control.get('id').value === evaluacionId
        );
        if (evaluacionIndex !== -1) {
            this[formArrayName].removeAt(evaluacionIndex);
            this.updateControlNames(this[formArrayName]);

            formArrayName == 'expertoEvaluaciones'
                ? this.evaluacionExpertoIds.splice(index, 1)
                : this.evaluacionDocenteIds.splice(index, 1);

            this.solicitudService.deleteAllFiles(evaluacionId).subscribe({
                next: () => {},
                error: (e) => this.handlerResponseException(e),
            });
            this.respuestaService.deleteEvaluacion(evaluacionId).subscribe({
                next: () => {
                    this.messageService.add(
                        errorMessage(Mensaje.EVALUACION_ELIMINADA_CORRECTAMENTE)
                    );
                },
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    this.selectedFiles = {};
                    if (formArrayName === 'expertoEvaluaciones') {
                        this.setup('docFormatoB');
                        this.setup('docFormatoC');
                        this.setup('docObservaciones');
                    } else if (formArrayName === 'docenteEvaluaciones') {
                        this.setup('docFormatoB');
                        this.setup('docFormatoC');
                        this.setup('docObservaciones');
                    }
                },
            });
        }
    }

    onRemove(arr: any) {
        this.selectedFiles[`${arr[1]}.${arr[0]}`] = null;
    }

    onArchivoSeleccionado(arr: any): void {
        this.selectedFiles[`${arr[2]}.${arr[0]}`] = arr[1];
    }

    getFileAndSetValue(
        formArrayName: string,
        fieldName: string,
        index: number
    ) {
        // this.expertoEvaluaciones
        //     .at(index)
        //     .get(`${fieldName}${index}`)
        //     .setValue(`${fieldName}${index}`);
        this.solicitudService
            .getFile(
                formArrayName == 'expertoEvaluaciones'
                    ? this.evaluacionExpertoIds[index]
                    : this.evaluacionDocenteIds[index],
                "evaluacionId",
                fieldName
            )
            .subscribe({
                next: (response: any) => {
                    const url = window.URL.createObjectURL(response.body);
                    const a = document.createElement('a');
                    document.body.appendChild(a);
                    a.style.display = 'none';
                    a.href = url;
                    a.download = fieldName;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                },
                error: (error: any) => {
                    this.handlerResponseException(error);
                },
            });
    }

    redirectToSolicitud(solicitudId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${solicitudId}`,
        ]);
    }

    redirectToResolucion(resolucionId: number) {
        resolucionId
            ? this.router.navigate([
                  `examen-de-valoracion/resolucion/editar/${resolucionId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/resolucion']);
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
        if (this.router.url.includes('editar')) {
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
