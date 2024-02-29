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
import { errorMessage, infoMessage } from 'src/app/core/utils/message-util';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { Respuesta } from '../../models/respuesta';
import { RespuestaService } from '../../services/respuesta.service';
import { Experto } from '../../models/experto';
import {
    Subject,
    debounceTime,
    distinctUntilChanged,
    filter,
    switchMap,
    takeUntil,
    timer,
} from 'rxjs';

@Component({
    selector: 'app-respuesta-examen',
    templateUrl: './respuesta-examen.component.html',
    styleUrls: ['./respuesta-examen.component.scss'],
})
export class RespuestaExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private unsubscribe$ = new Subject<void>();

    isLoading: boolean;
    editMode: boolean = false;

    respuestaId: number;
    solicitudId: number;

    respuestaForm: FormGroup;

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    expertoSeleccionado: Experto;

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
                            this.respuestaId = response.respuestaId;
                            this.solicitudService.setRespuestaSeleccionada(
                                response
                            );

                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.router.navigate([
                                    'examen-de-valoracion/respuesta/editar',
                                    response.respuestaId,
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
        this.solicitudService.evaluadorExternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                this.expertoSeleccionado = response;
                this.respuestaForm
                    .get('experto')
                    .setValue(this.expertoSeleccionado.id);
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    getFormControl(formControlName: string): FormControl {
        return this.respuestaForm.get(formControlName) as FormControl;
    }

    initForm(): void {
        this.respuestaForm = this.fb.group({
            titulo: [null, Validators.required],
            solicitud: [null, Validators.required],
            docente: [null, Validators.required],
            experto: [null, Validators.required],
            evaluaciones: this.fb.array([
                this.fb.group({
                    doc_formatoB: [null, Validators.required],
                    doc_formatoC: [null, Validators.required],
                    doc_observaciones: [null, Validators.required],
                    estado_respuesta: [null, Validators.required],
                }),
            ]),
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
        this.respuestaForm.valueChanges
            .pipe(
                debounceTime(300), // Espera 300ms después de la última pulsación de tecla
                distinctUntilChanged(), // Solo emite si los valores son diferentes
                filter(() => this.respuestaForm.dirty), // Filtra si el formulario ha sido modificado
                takeUntil(this.unsubscribe$),
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
    }

    ngOnDestroy() {
        // Finalizar la suscripción al destruir el componente
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    agregarEvaluacion() {
        this.evaluaciones.push(
            this.fb.group({
                doc_formatoB: [null, Validators.required],
                doc_formatoC: [null, Validators.required],
                doc_observaciones: [null, Validators.required],
                estado_respuesta: [null, Validators.required],
            })
        );
    }

    eliminarEvaluacion(index: number) {
        this.evaluaciones.removeAt(index);
    }

    onFileSelectFirst(event: any) {
        this.uploadFileAndSetValue(0, 'doc_formatoB', event);
    }

    private uploadFileAndSetValue(
        index: number,
        formControlName: string,
        event: any
    ) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            const selectedFile = selectedFiles[0];

            this.respuestaService
                .uploadFile(
                    selectedFile,
                    this.estudianteSeleccionado.id,
                    formControlName
                )
                .subscribe({
                    next: () =>
                        this.messageService.add(
                            infoMessage(Mensaje.GUARDADO_EXITOSO)
                        ),
                    error: (e) => this.handlerResponseException(e),
                });

            this.evaluaciones
                .at(index)
                .get(formControlName)
                .setValue(selectedFile);

            return selectedFile;
        }

        return null;
    }

    // getFileAndSetValue(fieldName: string) {
    //     return this.solicitudService.getFile(
    //         this.estudianteSeleccionado.id,
    //         fieldName
    //     );
    // }

    onEdit(respuestaId: number) {
        this.router.navigate([
            `examen-de-valoracion/respuesta/editar/${respuestaId}`,
        ]);
    }

    rediectToRespuesta(respuestaId: number) {
        this.router.navigate([
            `examen-de-valoracion/respuesta/editar/${respuestaId}`,
        ]);
    }

    redirectToSolicitud(solicitudId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${solicitudId}`,
        ]);
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
