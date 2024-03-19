import {
    Component,
    EventEmitter,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Experto } from '../../models/experto';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import {
    Subject,
    debounceTime,
    distinctUntilChanged,
    switchMap,
    takeUntil,
    timer,
} from 'rxjs';
import { SolicitudService } from '../../services/solicitud.service';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { ResolucionService } from '../../services/resolucion.service';
import { Resolucion } from '../../models/resolucion';
import { FileUpload } from 'primeng/fileupload';
import { Mensaje } from 'src/app/core/enums/enums';
import { BuscadorExpertosComponent } from 'src/app/shared/components/buscador-expertos/buscador-expertos.component';
import { BuscadorDocentesComponent } from 'src/app/shared/components/buscador-docentes/buscador-docentes.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-resolucion-examen',
    templateUrl: './resolucion-examen.component.html',
    styleUrls: ['./resolucion-examen.component.scss'],
})
export class ResolucionExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    private unsubscribe_resolucion$ = new Subject<void>();

    @ViewChild('AnteproyectoAprobado') AnteproyectoAprobado!: FileUpload;
    @ViewChild('SolicitudComite') SolicitudComite!: FileUpload;
    @ViewChild('SolicitudConcejo') SolicitudConcejo!: FileUpload;
    @ViewChild('ResolucionConcejo') ResolucionConcejo!: FileUpload;

    FileAnteproyectoAprobado: File | null;
    FileSolicitudComite: File | null;
    FileSolicitudConcejo: File | null;
    FileResolucionConcejo: File | null;

    isLoading: boolean = false;
    editMode: boolean = false;

    solicitudId: number;
    respuestaId: number;
    resolucionId: number;

    resolucionForm: FormGroup;

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    codirectorSeleccionado: Experto;
    directorSeleccionado: Docente;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private resolucionService: ResolucionService,
        private solicitudService: SolicitudService,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private dialogService: DialogService
    ) {}

    get director(): FormControl {
        return this.resolucionForm.get('director') as FormControl;
    }

    get codirector(): FormControl {
        return this.resolucionForm.get('codirector') as FormControl;
    }

    ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        if (this.router.url.includes('editar')) {
            this.loadEditMode();
        }
        this.loadData();
        this.setBreadcrumb();
        this.setup('anteproyectoAprobado');
        this.setup('solicitudComite');
        this.setup('solicitudConcejo');
        this.setup('resolucionConcejo');
    }

    loadEditMode() {
        this.editMode = true;
        this.loadResolucion();
    }

    initForm(): void {
        this.resolucionForm = this.fb.group({
            titulo: [null, Validators.required],
            solicitud: [null, Validators.required],
            director: [null],
            codirector: [null],
            numeroActaRevision: [null],
            fechaActa: [null],
            anteproyectoAprobado: [null],
            solicitudComite: [null],
            solicitudConcejo: [null],
            numeroResolucion: [null],
            fechaResolucion: [null],
            resolucionConcejo: [null],
        });

        this.formReady.emit(this.resolucionForm);
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
                    this.resolucionForm
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
    }

    loadData(): void {
        if (!this.editMode) {
            this.isLoading = true;
            this.resolucionService
                .createResolucion(this.resolucionForm.value)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            console.log(
                                'Datos guardados en el backend-resolucion:',
                                response
                            );
                            this.resolucionId = response.id;
                            this.solicitudService.setResolucionSeleccionada(
                                response
                            );
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.router.navigate([
                                    'examen-de-valoracion/resolucion/editar',
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
            this.resolucionId
        ) {
            this.solicitudService
                .getFile(this.resolucionId, 'resolucionId', fieldName)
                .subscribe({
                    next: (response: any) => {
                        if (response) {
                            this.resolucionForm
                                .get(fieldName)
                                .setValue(fieldName);
                            const regex =
                                /resolucionId=(\d+)&tipoDocumento=(\w+)/;
                            const match = response.url.match(regex);

                            if (match) {
                                const resolucionId = match[1];
                                const tipoDocumento = match[2];
                                const combined = `${resolucionId}_${tipoDocumento}`;

                                const file = new File(
                                    [response.body],
                                    combined,
                                    {
                                        type: response.type,
                                    }
                                );

                                switch (fieldName) {
                                    case 'anteproyectoAprobado':
                                        this.FileAnteproyectoAprobado = file;
                                        break;
                                    case 'solicitudComite':
                                        this.FileSolicitudComite = file;
                                        break;
                                    case 'solicitudConcejo':
                                        this.FileSolicitudConcejo = file;
                                        break;
                                    case 'resolucionConcejo':
                                        this.FileResolucionConcejo = file;
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

    setValuesForm(resolucion: Resolucion) {
        this.resolucionForm.patchValue({
            ...resolucion,
        });
    }

    loadResolucion() {
        this.resolucionService
            .getResolucionBySolicitud(this.solicitudId)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.setValuesForm(response);
                        this.resolucionForm
                            .get('titulo')
                            .setValue(this.tituloSeleccionado);
                        this.resolucionForm
                            .get('fechaActa')
                            .setValue(
                                response?.fechaActa
                                    ? new Date(response.fechaActa)
                                    : null
                            );
                        this.resolucionForm
                            .get('fechaResolucion')
                            .setValue(
                                response?.fechaResolucion
                                    ? new Date(response.fechaResolucion)
                                    : null
                            );
                    }
                },
            });
        this.resolucionForm.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.unsubscribe_resolucion$),
                switchMap(() =>
                    this.resolucionService.updateResolucion(
                        this.resolucionForm.value,
                        this.solicitudId
                    )
                )
            )
            .subscribe({
                next: (response) => {
                    if (response) {
                        console.log(
                            'Datos actualizados en el backend: resolucion',
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
        this.unsubscribe_resolucion$.next();
        this.unsubscribe_resolucion$.complete();
    }

    onFileSelectFirst(event: any) {
        this.FileAnteproyectoAprobado = this.uploadFileAndSetValue(
            'anteproyectoAprobado',
            event
        );
    }

    onFileSelectSecond(event: any) {
        this.FileSolicitudComite = this.uploadFileAndSetValue(
            'solicitudComite',
            event
        );
    }

    onFileSelectThird(event: any) {
        this.FileSolicitudConcejo = this.uploadFileAndSetValue(
            'solicitudConcejo',
            event
        );
    }

    onFileSelectFourth(event: any) {
        this.FileResolucionConcejo = this.uploadFileAndSetValue(
            'resolucionConcejo',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'anteproyectoAprobado') {
            this.FileAnteproyectoAprobado = null;
            this.AnteproyectoAprobado.clear();
            this.solicitudService
                .deleteFile(this.resolucionId, 'resolucionId', field)
                .subscribe({
                    next: () => {
                        this.resolucionForm.get('anteproyectoAprobado').reset();
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        );
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
        if (field == 'solicitudComite') {
            this.FileSolicitudComite = null;
            this.SolicitudComite.clear();
            this.solicitudService
                .deleteFile(this.resolucionId, 'resolucionId', field)
                .subscribe({
                    next: () => {
                        this.resolucionForm.get('solicitudComite').reset();
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        );
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
        if (field == 'solicitudConcejo') {
            this.FileSolicitudConcejo = null;
            this.SolicitudConcejo.clear();
            this.solicitudService
                .deleteFile(this.resolucionId, 'resolucionId', field)
                .subscribe({
                    next: () => {
                        this.resolucionForm.get('solicitudConcejo').reset();
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        );
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
        if (field == 'resolucionConcejo') {
            this.FileResolucionConcejo = null;
            this.ResolucionConcejo.clear();
            this.solicitudService
                .deleteFile(this.resolucionId, 'resolucionId', field)
                .subscribe({
                    next: () => {
                        this.resolucionForm.get('resolucionConcejo').reset();
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
                    this.resolucionId,
                    'resolucionId',
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
            this.resolucionForm.get(fileControlName).setValue(fileControlName);
            return selectedFile;
        }
        return null;
    }

    getFileAndSetValue(fieldName: string) {
        // this.resolucionForm.get(fieldName).setValue(fieldName);
        this.solicitudService
            .getFile(this.resolucionId, 'resolucionId', fieldName)
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

    showBuscadorDocentes() {
        return this.dialogService.open(BuscadorDocentesComponent, {
            header: 'Seleccionar docente',
            width: '60%',
        });
    }

    showBuscadorExpertos() {
        return this.dialogService.open(BuscadorExpertosComponent, {
            header: 'Seleccionar experto',
            width: '60%',
        });
    }

    mapDocenteLabel(docente: Docente) {
        const ultimaUniversidad =
            docente.titulos.length > 0
                ? docente.titulos[docente.titulos.length - 1].universidad
                : 'Sin título universitario';

        return {
            id: docente.id,
            nombre: docente.persona.nombre,
            apellido: docente.persona.apellido,
            correo: docente.persona.correoElectronico,
            universidad: ultimaUniversidad,
        };
    }

    mapExpertoLabel(experto: Experto) {
        const ultimaUniversidad =
            experto.titulos.length > 0
                ? experto.titulos[experto.titulos.length - 1].universidad
                : 'Sin título universitario';

        return {
            id: experto.id,
            nombre: experto.persona.nombre,
            apellido: experto.persona.apellido,
            correo: experto.persona.correoElectronico,
            universidad: ultimaUniversidad,
        };
    }

    onSeleccionarDirector() {
        const ref = this.showBuscadorDocentes();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const docente = this.mapDocenteLabel(response);
                    this.directorSeleccionado = docente;
                    this.director.setValue(docente.id);
                }
            },
        });
    }

    onSeleccionarCodirector() {
        const ref = this.showBuscadorExpertos();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const experto = this.mapExpertoLabel(response);
                    this.codirectorSeleccionado = experto;
                    this.codirector.setValue(experto.id);
                }
            },
        });
    }

    limpiarCodirector() {
        this.codirector.setValue(null);
        this.codirectorSeleccionado = null;
    }

    limpiarDirector() {
        this.director.setValue(null);
        this.directorSeleccionado = null;
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
