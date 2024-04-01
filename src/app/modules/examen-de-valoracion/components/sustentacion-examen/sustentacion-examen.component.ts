import {
    Component,
    EventEmitter,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import {
    Subject,
    debounceTime,
    distinctUntilChanged,
    switchMap,
    takeUntil,
    timer,
} from 'rxjs';
import { SolicitudService } from '../../services/solicitud.service';
import { FileUpload } from 'primeng/fileupload';
import { Estudiante } from '../../../gestion-estudiantes/models/estudiante';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { SustentacionService } from '../../services/sustentacion.service';
import { Mensaje } from 'src/app/core/enums/enums';
import { Sustentacion } from '../../models/sustentacion';

@Component({
    selector: 'app-sustentacion-examen',
    templateUrl: './sustentacion-examen.component.html',
    styleUrls: ['./sustentacion-examen.component.scss'],
})
export class SustentacionExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private unsubscribe_sustentacion$ = new Subject<void>();

    @ViewChild('RemisionComite') RemisionComite!: FileUpload;
    // @ViewChild('SolicitudComite') SolicitudComite!: FileUpload;
    // @ViewChild('SolicitudConcejo') SolicitudConcejo!: FileUpload;
    // @ViewChild('ResolucionConcejo') ResolucionConcejo!: FileUpload;

    FileRemisionComite: File | null;
    // FileSolicitudComite: File | null;
    // FileSolicitudConcejo: File | null;
    // FileResolucionConcejo: File | null;

    isLoading: boolean = false;
    editMode: boolean = false;

    solicitudId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;

    sustentacionForm: FormGroup;

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private solicitudService: SolicitudService,
        private sustentacionService: SustentacionService,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
    ) {}

    ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        if (this.router.url.includes('editar')) {
            this.loadEditMode();
        }
        this.loadData();
        this.setBreadcrumb();
        this.setup('remisionComite');
    }

    loadEditMode() {
        this.editMode = true;
        this.loadResolucion();
    }

    initForm(): void {
        this.sustentacionForm = this.fb.group({
            solicitud: [null, Validators.required],
            remisionComite: [null],
            linkDocumentacion: [null],
            remisionConcejo: [null],
            constanciaVersion: [null],
            actaSustentacion: [null],
            actaPublica: [null],
            respuestaSustentacion: [null],
            hojaAcademica: [null],
            numeroRevision: [null],
            fechaActa: [null],
            numeroActaRevision: [null],
            numeroResolucion: [null],
        });

        this.formReady.emit(this.sustentacionForm);
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
        this.solicitudService.respuestaSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.respuestaId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.solicitudSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.solicitudId = response.solicitudId;
                    this.sustentacionForm
                        .get('solicitud')
                        .setValue(response.solicitudId);
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
        this.solicitudService.sustentacionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.sustentacionId = response.id;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
    }

    loadData(): void {
        if (!this.editMode) {
            this.isLoading = true;
            this.sustentacionService
                .createSustentacion(this.sustentacionForm.value)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            console.log(
                                'Datos guardados en el backend-sustentacion:',
                                response
                            );
                            this.sustentacionId = response.id;
                            this.solicitudService.setSustentacionSeleccionada(
                                response
                            );
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.router.navigate([
                                    'examen-de-valoracion/sustentacion/editar',
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

    setup(fieldName: string) {
        if (
            Object.keys(this.estudianteSeleccionado).length > 0 &&
            this.sustentacionId
        ) {
            this.solicitudService
                .getFile(this.sustentacionId, 'sustentacionId', fieldName)
                .subscribe({
                    next: (response: any) => {
                        if (response) {
                            this.sustentacionForm
                                .get(fieldName)
                                .setValue(fieldName);
                            const regex =
                                /sustentacionId=(\d+)&tipoDocumento=(\w+)/;
                            const match = response.url.match(regex);

                            if (match) {
                                const sustentacionId = match[1];
                                const tipoDocumento = match[2];
                                const combined = `${sustentacionId}_${tipoDocumento}`;

                                const file = new File(
                                    [response.body],
                                    combined,
                                    {
                                        type: response.type,
                                    }
                                );

                                switch (fieldName) {
                                    case 'remisionComite':
                                        this.FileRemisionComite = file;
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
    }

    setValuesForm(sustentacion: Sustentacion) {
        this.sustentacionForm.patchValue({
            ...sustentacion,
        });
    }

    loadResolucion() {
        this.sustentacionService
            .getSustentacionBySolicitud(this.solicitudId)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.setValuesForm(response);
                        this.sustentacionForm
                            .get('fechaActa')
                            .setValue(
                                response?.fechaActa
                                    ? new Date(response.fechaActa)
                                    : null
                            );
                    }
                },
            });
        this.sustentacionForm.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.unsubscribe_sustentacion$),
                switchMap(() =>
                    this.sustentacionService.updateSustentacion(
                        this.sustentacionForm.value,
                        this.solicitudId
                    )
                )
            )
            .subscribe({
                next: (response) => {
                    if (response) {
                        console.log(
                            'Datos actualizados en el backend: sustentacion',
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
        this.unsubscribe_sustentacion$.next();
        this.unsubscribe_sustentacion$.complete();
    }

    onFileSelectFirst(event: any) {
        this.FileRemisionComite = this.uploadFileAndSetValue(
            'remisionComite',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'remisionComite') {
            this.FileRemisionComite = null;
            this.RemisionComite.clear();
            this.solicitudService
                .deleteFile(this.sustentacionId, 'sustentacionId', field)
                .subscribe({
                    next: () => {
                        this.sustentacionForm.get('remisionComite').reset();
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        );
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
    }

    uploadFileAndSetValue(fileControlName: string, event: any) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            const selectedFile = selectedFiles[0];

            this.solicitudService
                .uploadFile(
                    this.sustentacionId,
                    'sustentacionId',
                    selectedFile,
                    fileControlName
                )
                .subscribe({
                    next: () =>
                        this.messageService.add(
                            infoMessage(Mensaje.GUARDADO_EXITOSO)
                        ),
                    error: (e) => {
                        this.messageService.add(
                            warnMessage(Mensaje.ARCHIVO_DEMASIADO_GRANDE)
                        ),
                            this.handlerResponseException(e);
                    },
                });
            this.sustentacionForm
                .get(fileControlName)
                .setValue(fileControlName);
            return selectedFile;
        }
        return null;
    }

    getFileAndSetValue(fieldName: string) {
        this.solicitudService
            .getFile(this.sustentacionId, 'sustentacionId', fieldName)
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

    redirectToRespuesta(respuestaId: number) {
        respuestaId
            ? this.router.navigate([
                  `examen-de-valoracion/respuesta/editar/${respuestaId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/respuesta']);
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
            { label: 'Resolucion' },
        ]);
    }
}
