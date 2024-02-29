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
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Mensaje } from 'src/app/core/enums/enums';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import {
    errorMessage,
    infoMessage,
    warnMessage,
} from 'src/app/core/utils/message-util';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { BuscadorDocentesComponent } from 'src/app/shared/components/buscador-docentes/buscador-docentes.component';
import { BuscadorExpertosComponent } from 'src/app/shared/components/buscador-expertos/buscador-expertos.component';
import { Experto } from '../../models/experto';
import { SolicitudService } from '../../services/solicitud.service';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import {
    Subject,
    debounceTime,
    distinctUntilChanged,
    filter,
    switchMap,
    take,
    takeUntil,
    timer,
} from 'rxjs';
import { Solicitud } from '../../models/solicitud';
import { FileUpload } from 'primeng/fileupload';

@Component({
    selector: 'app-solicitud-examen',
    templateUrl: 'solicitud-examen.component.html',
    styleUrls: ['solicitud-examen.component.scss'],
})
export class SolicitudExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    @ViewChild('fileUpload1') fileUpload1!: FileUpload;
    @ViewChild('fileUpload2') fileUpload2!: FileUpload;
    @ViewChild('fileUpload3') fileUpload3!: FileUpload;
    @ViewChild('fileUpload4') fileUpload4!: FileUpload;

    private unsubscribe$ = new Subject<void>();

    solicitudId: number;
    respuestaId: number;

    isLoading: boolean;
    editMode: boolean = false;
    isSolicitudValid: boolean;

    solicitudForm: FormGroup;
    estudianteSeleccionado: Estudiante = {};
    docenteSeleccionado: Docente;
    expertoSeleccionado: Experto;

    selectedFileFirst: File | null;
    selectedFileSecond: File | null;
    selectedFileThird: File | null;
    selectedFileFourth: File | null;

    constructor(
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private solicitudService: SolicitudService,
        private route: ActivatedRoute,
        private fb: FormBuilder,
        private router: Router
    ) {}

    get docente(): FormControl {
        return this.solicitudForm.get('docente') as FormControl;
    }

    get experto(): FormControl {
        return this.solicitudForm.get('experto') as FormControl;
    }

    get estudiante(): FormControl {
        return this.solicitudForm.get('estudiante') as FormControl;
    }

    ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        if (this.router.url.includes('editar')) {
            this.loadEditMode();
        }
        this.loadData();
        this.setup('doc_solicitud_valoracion');
        this.setup('doc_anteproyecto_examen');
        this.setup('doc_examen_valoracion');
        this.setup('doc_oficio_jurados');
        this.setBreadcrumb();
    }

    initForm(): void {
        this.solicitudForm = this.fb.group({
            titulo: [null, Validators.required],
            fecha: [null, Validators.required],
            estado: [null, Validators.required],
            doc_solicitud_valoracion: [null, Validators.required],
            doc_anteproyecto_examen: [null, Validators.required],
            doc_examen_valoracion: [null],
            estudiante: [null, Validators.required],
            docente: [null, Validators.required],
            experto: [null, Validators.required],
            numero_acta: [null, Validators.required],
            fecha_acta: [null],
            doc_oficio_jurados: [null],
            fecha_maxima_evaluacion: [null],
        });

        this.formReady.emit(this.solicitudForm);
    }

    loadData(): void {
        if (!this.editMode) {
            this.isLoading = true;
            this.isSolicitudValid = false;
            this.solicitudForm
                .get('fecha')
                .setValue(new Date().toISOString().split('T')[0]);
            this.solicitudForm
                .get('estado')
                .setValue(Mensaje.SIN_REGISTRAR_SOLICITUD_EXAMEN);
            this.solicitudService
                .createSolicitud(this.solicitudForm.value)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            console.log(
                                'Datos guardados en el backend:',
                                response
                            );
                        }
                    },
                    error: () => {
                        console.error(
                            'Error al guardar los datos en el backend:'
                        );
                    },
                    complete: () => {
                        timer(2000).subscribe(() => {
                            this.isLoading = false;
                            this.router.navigate(['examen-de-valoracion']);
                        });
                    },
                });
        }
    }

    setup(fieldName: string) {
        if (Object.keys(this.estudianteSeleccionado).length > 0) {
            this.solicitudService
                .getFile(this.estudianteSeleccionado?.id, fieldName)
                .subscribe({
                    next: (response: any) => {
                        const regex = /estudianteId=(\d+)&tipoDocumento=(\w+)/;
                        const match = response.url.match(regex);

                        if (match) {
                            const estudianteId = match[1];
                            const tipoDocumento = match[2];
                            const combined = `${estudianteId}_${tipoDocumento}`;

                            const file = new File([response.body], combined, {
                                type: response.type,
                            });

                            switch (fieldName) {
                                case 'doc_solicitud_valoracion':
                                    this.selectedFileFirst = file;
                                    break;
                                case 'doc_anteproyecto_examen':
                                    this.selectedFileSecond = file;
                                    break;
                                case 'doc_examen_valoracion':
                                    this.selectedFileThird = file;
                                    break;
                                case 'doc_oficio_jurados':
                                    this.selectedFileFourth = file;
                                    break;
                                default:
                                    break;
                            }
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }
    }

    loadEditMode() {
        this.editMode = true;
        this.loadSolicitud();
    }

    loadSolicitud() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.solicitudService.getSolicitud(id).subscribe({
            next: (response) => {
                if (response) {
                    this.setValuesForm(response);
                    this.solicitudForm
                        .get('fecha_acta')
                        .setValue(
                            response?.fecha_acta
                                ? new Date(response.fecha_acta)
                                : null
                        );
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudForm.valueChanges
            .pipe(
                debounceTime(300), // Espera 300ms después de la última pulsación de tecla
                distinctUntilChanged(), // Solo emite si los valores son diferentes
                filter(() => this.solicitudForm.dirty), // Filtra si el formulario ha sido modificado
                takeUntil(this.unsubscribe$),
                switchMap(() =>
                    this.solicitudService.updateSolicitud(
                        this.solicitudForm.value,
                        id
                    )
                )
            )
            .subscribe({
                next: (response) => {
                    if (response) {
                        console.log('Datos actualizados en el backend:');
                        this.solicitudService.setTituloSeleccionadoSubject(
                            this.solicitudForm.get('titulo').value
                        );
                        if (this.solicitudForm.valid) {
                            this.solicitudService
                                .updateSolicitud(
                                    {
                                        ...this.solicitudForm.value,
                                        estado: Mensaje.PENDIENTE_RESULTADO_EXAMEN,
                                    },
                                    id
                                )
                                .pipe(take(1))
                                .subscribe(() => {
                                    console.log('Estado actualizado con éxito');
                                    this.isSolicitudValid = true;
                                });
                        }
                    }
                },
            });
    }

    ngOnDestroy() {
        // Finalizar la suscripción al destruir el componente
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    setValuesForm(solicitud: Solicitud) {
        this.solicitudForm.patchValue({
            ...solicitud,
        });
    }

    subscribeToObservers() {
        this.solicitudService.estudianteSeleccionado$.subscribe({
            next: (response) => {
                if (response) {
                    this.estudianteSeleccionado = response;
                    this.estudiante.setValue(response.id);
                } else {
                    this.router.navigate(['examen-de-valoracion']);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.respuestaSeleccionadaSubject$.subscribe(
            (response) => {
                if (response) {
                    this.respuestaId = response.respuestaId;
                }
            }
        );
    }

    onFileSelectFirst(event: any) {
        this.selectedFileFirst = this.uploadFileAndSetValue(
            'doc_solicitud_valoracion',
            event
        );
    }

    onFileSelectSecond(event: any) {
        this.selectedFileSecond = this.uploadFileAndSetValue(
            'doc_anteproyecto_examen',
            event
        );
    }

    onFileSelectThird(event: any) {
        this.selectedFileThird = this.uploadFileAndSetValue(
            'doc_examen_valoracion',
            event
        );
    }

    onFileSelectFourth(event: any) {
        this.selectedFileFourth = this.uploadFileAndSetValue(
            'doc_oficio_jurados',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'doc_solicitud_valoracion') {
            this.selectedFileFirst = null;
            this.fileUpload1.clear();
            this.solicitudService
                .deleteFile(this.estudianteSeleccionado.id, field)
                .subscribe({
                    next: () =>
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        ),
                    error: (e) => this.handlerResponseException(e),
                });
        }
        if (field == 'doc_anteproyecto_examen') {
            this.selectedFileSecond = null;
            this.fileUpload2.clear();
            this.solicitudService
                .deleteFile(this.estudianteSeleccionado.id, field)
                .subscribe({
                    next: () =>
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        ),
                    error: (e) => this.handlerResponseException(e),
                });
        }
        if (field == 'doc_examen_valoracion') {
            this.selectedFileThird = null;
            this.fileUpload3.clear();
            this.solicitudService
                .deleteFile(this.estudianteSeleccionado.id, field)
                .subscribe({
                    next: () =>
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        ),
                    error: (e) => this.handlerResponseException(e),
                });
        }
        if (field == 'doc_oficio_jurados') {
            this.selectedFileFourth = null;
            this.fileUpload4.clear();
            this.solicitudService
                .deleteFile(this.estudianteSeleccionado.id, field)
                .subscribe({
                    next: () =>
                        this.messageService.add(
                            infoMessage(Mensaje.ARCHIVO_ELIMINADO_CORRECTAMENTE)
                        ),
                    error: (e) => this.handlerResponseException(e),
                });
        }
    }

    private uploadFileAndSetValue(fileControlName: string, event: any) {
        const selectedFiles: FileList = event.files;

        if (selectedFiles && selectedFiles.length > 0) {
            const selectedFile = selectedFiles[0];

            this.solicitudService
                .uploadFile(
                    selectedFile,
                    this.estudianteSeleccionado.id,
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

            this.solicitudForm.get(fileControlName).setValue(selectedFile);

            return selectedFile;
        }

        return null;
    }

    getFileAndSetValue(fieldName: string) {
        this.solicitudForm.get(fieldName).setValue(fieldName); // para simular
        this.solicitudService
            .getFile(this.estudianteSeleccionado.id, fieldName)
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
                    this.messageService.add(
                        infoMessage(Mensaje.ACTUALIZACION_EXITOSA)
                    );
                },
                error: (error: any) => {
                    this.handlerResponseException(error);
                },
            });
    }

    getFormControl(formControlName: string): FormControl {
        return this.solicitudForm.get(formControlName) as FormControl;
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

    onSeleccionarDocente() {
        const ref = this.showBuscadorDocentes();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const docente = this.mapDocenteLabel(response);
                    this.docenteSeleccionado = docente;
                    this.docente.setValue(this.docenteSeleccionado.id);
                }
            },
        });
    }

    onSeleccionarExperto() {
        const ref = this.showBuscadorExpertos();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const experto = this.mapExpertoLabel(response);
                    this.expertoSeleccionado = experto;
                    this.solicitudService.setEvaluadorExternoSeleccionadoSubject(
                        this.expertoSeleccionado
                    );
                    this.experto.setValue(this.expertoSeleccionado.id);
                }
            },
        });
    }

    mapRequest(): any {
        const value = this.solicitudForm.getRawValue();
        return {
            titulo: value.titulo,
            doc_solicitud_valoracion: value.doc_solicitud_valoracion,
            doc_anteproyecto_examen: value.doc_anteproyecto_examen,
            doc_examen_valoracion: value.doc_examen_valoracion,
            estudiante: value.estudiante?.id,
            docente: value.docente?.id,
            experto: value.experto?.id,
            numero_acta: value.numero_acta,
            fecha_acta: value.fecha_acta,
            doc_oficio_jurados: value.doc_oficio_jurados,
            fecha_maxima_evaluacion: value.fecha_maxima_evaluacion,
        };
    }

    onCrearDocumento() {
        this.router.navigate(['examen-de-valoracion/solicitud/crear']);
    }

    limpiarExperto() {
        this.experto.setValue(null);
        this.expertoSeleccionado = null;
    }

    limpiarDocente() {
        this.docente.setValue(null);
        this.docenteSeleccionado = null;
    }

    onEdit(solicitudId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${solicitudId}`,
        ]);
    }

    rediectToRespuesta(respuestaId: number) {
        respuestaId
            ? this.router.navigate([
                  `examen-de-valoracion/respuesta/editar/${respuestaId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/respuesta']);
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
            { label: 'Solicitud' },
        ]);
    }
}
