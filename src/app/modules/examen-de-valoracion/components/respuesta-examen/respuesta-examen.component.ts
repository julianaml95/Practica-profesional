import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { Router } from '@angular/router';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
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
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';

@Component({
    selector: 'app-respuesta-examen',
    templateUrl: './respuesta-examen.component.html',
    styleUrls: ['./respuesta-examen.component.scss'],
})
export class RespuestaExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private unsubscribe_respuesta$ = new Subject<void>();
    private unsubscribe_evaluacion$ = new Subject<void>();

    isLoading: boolean;
    editMode: boolean = false;

    solicitudId: number;
    respuestaId: number;
    resolucionId: number;

    respuestaForm: FormGroup;

    selectedFiles: { [key: string]: File | string | null } = {};
    evaluacionIds: number[] = [];

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    expertoSeleccionado: Experto;
    docenteSeleccionado: Docente;

    estados: any[] = [
        { name: 'Aprobado' },
        { name: 'Aplazado' },
        { name: 'No Aprobado' },
    ];

    constructor(
        private solicitudService: SolicitudService,
        private router: Router,
        private fb: FormBuilder,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private respuestaService: RespuestaService
    ) {}

    get evaluaciones(): FormArray {
        return this.respuestaForm.get('evaluaciones') as FormArray;
    }

    get docente(): FormControl {
        return this.respuestaForm.get('docente') as FormControl;
    }

    get experto(): FormControl {
        return this.respuestaForm.get('experto') as FormControl;
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
        this.loadSolicitud();
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
        this.solicitudService.evaluadorExternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                this.expertoSeleccionado = response;
                this.respuestaForm
                    .get('experto')
                    .setValue(this.expertoSeleccionado.id);
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.evaluadorInternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                this.docenteSeleccionado = response;
                this.respuestaForm
                    .get('docente')
                    .setValue(this.docenteSeleccionado.id);
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    setup(fieldName: string) {
        if (this.evaluacionIds?.length > 0) {
            this.evaluacionIds.forEach(
                (evaluacionId: number, index: number) => {
                    this.solicitudService
                        .getFile(evaluacionId, false, fieldName)
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

                                        this.selectedFiles[fieldName + index] =
                                            file;
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
            docente: [null, Validators.required],
            experto: [null, Validators.required],
            evaluaciones: this.fb.array([]),
            fecha_correcciones: [null, Validators.required],
        });

        this.formReady.emit(this.respuestaForm);
    }

    setValuesForm(respuesta: Respuesta) {
        this.respuestaForm.patchValue({
            ...respuesta,
        });
    }

    loadSolicitud() {
        this.respuestaService
            .getRespuestaBySolicitud(this.solicitudId)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.setValuesForm(response);
                        this.respuestaForm
                            .get('fecha_correcciones')
                            .setValue(
                                response?.fecha_correcciones
                                    ? new Date(response.fecha_correcciones)
                                    : null
                            );
                        this.respuestaForm
                            .get('titulo')
                            .setValue(this.tituloSeleccionado);
                    }
                },
            });
        this.respuestaService.getEvaluaciones(this.respuestaId).subscribe({
            next: (response) => {
                if (response?.length > 0) {
                    response.forEach(
                        (evaluacion: Evaluacion, index: number) => {
                            this.evaluacionIds.push(evaluacion.id); // Agregar el ID al arreglo
                            const evaluacionFormGroup = this.fb.group({
                                ['docFormatoB' + index]: [
                                    evaluacion.docFormatoB,
                                    Validators.required,
                                ],
                                ['docFormatoC' + index]: [
                                    evaluacion.docFormatoC,
                                ],
                                ['docObservaciones' + index]: [
                                    evaluacion.docObservaciones,
                                ],
                                ['estadoRespuesta' + index]: [
                                    evaluacion.estadoRespuesta,
                                    Validators.required,
                                ],
                            });
                            this.evaluaciones.push(evaluacionFormGroup);
                        }
                    );
                    this.setup('docFormatoB');
                    this.setup('docFormatoC');
                    this.setup('docFormatoObservaciones');
                }
            },
        });
        this.respuestaForm.valueChanges
            .pipe(
                debounceTime(300), // Espera 300ms después de la última pulsación de tecla
                distinctUntilChanged(), // Solo emite si los valores son diferentes
                // filter(() => this.respuestaForm.dirty), // Filtra si el formulario ha sido modificado
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

        this.evaluaciones.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.unsubscribe_evaluacion$)
            )
            .subscribe((evaluaciones) => {
                evaluaciones.forEach(
                    (evaluacionData: Evaluacion, index: number) => {
                        const evaluacionId = this.evaluacionIds[index];
                        const evaluacion: Evaluacion = {
                            estadoRespuesta:
                                evaluacionData['estadoRespuesta' + index],
                        };
                        this.respuestaService
                            .updateEvaluacion(evaluacion, evaluacionId)
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
                    }
                );
            });
    }

    ngOnDestroy() {
        // Finalizar la suscripción al destruir el componente
        this.unsubscribe_respuesta$.next();
        this.unsubscribe_respuesta$.complete();

        this.unsubscribe_evaluacion$.next();
        this.unsubscribe_evaluacion$.complete();
    }

    mapEvaluacion() {
        return this.evaluaciones.value.map(
            (evaluacion: Evaluacion, i: number) => ({
                docFormatoB: evaluacion['docFormatoB' + i],
                docFormatoC: evaluacion['docFormatoC' + i],
                docObservaciones: evaluacion['docObservaciones' + i],
                estadoRespuesta: evaluacion['estadoRespuesta' + i],
            })
        );
    }

    agregarEvaluacion() {
        if (this.evaluaciones.invalid) {
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
        } else {
            const evaluacion = this.fb.group({
                ['docFormatoB' + this.evaluaciones.length]: [
                    null,
                    Validators.required,
                ],
                ['docFormatoC' + this.evaluaciones.length]: [null],
                ['docObservaciones' + this.evaluaciones.length]: [null],
                ['estadoRespuesta' + this.evaluaciones.length]: [
                    null,
                    Validators.required,
                ],
            });
            this.evaluaciones.push(evaluacion);

            const evaluacionesData = this.mapEvaluacion();

            this.respuestaService
                .createEvaluacion(
                    evaluacionesData[this.evaluaciones.value.length - 1],
                    this.respuestaId
                )
                .subscribe({
                    next: (response) => {
                        if (response) {
                            this.evaluacionIds.push(response.id); // Agregar el ID al arreglo

                            this.messageService.add(
                                infoMessage(Mensaje.REGISTRO_EVALUACION_EXITOSO)
                            );
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
    }

    eliminarEvaluacion(index: number) {
        const evaluacionId = this.evaluacionIds[index];

        Object.keys(this.selectedFiles).forEach((key) => {
            if (
                key.startsWith(`docFormatoB${index}`) ||
                key.startsWith(`docFormatoC${index}`) ||
                key.startsWith(`docObservaciones${index}`)
            ) {
                delete this.selectedFiles[key];
            }
        });

        this.solicitudService.deleteAllFiles(evaluacionId).subscribe({
            next: () => {},
            error: (e) => this.handlerResponseException(e),
        });
        this.respuestaService.deleteEvaluacion(evaluacionId).subscribe({
            next: () =>
                this.messageService.add(
                    infoMessage(Mensaje.EVALUACION_ELIMINADA_CORRECTAMENTE)
                ),
            error: (e) => this.handlerResponseException(e),
        });
        this.evaluacionIds.splice(index, 1); // Eliminar el ID del arreglo
        this.evaluaciones.removeAt(index);
    }

    onRemove(filename: string) {
        this.selectedFiles[filename] = null;
    }

    onArchivoSeleccionado(arr: any): void {
        this.selectedFiles[arr[0]] = arr[1];
    }

    getFileAndSetValue(fieldName: string, index: number) {
        this.evaluaciones
            .at(index)
            .get(`${fieldName}${index}`)
            .setValue(`${fieldName}${index}`);
        this.solicitudService
            .getFile(this.evaluacionIds[index], false, `${fieldName}`)
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

    onEdit(respuestaId: number) {
        this.router.navigate([
            `examen-de-valoracion/respuesta/editar/${respuestaId}`,
        ]);
    }

    redirectToRespuesta(respuestaId: number) {
        this.router.navigate([
            `examen-de-valoracion/respuesta/editar/${respuestaId}`,
        ]);
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
