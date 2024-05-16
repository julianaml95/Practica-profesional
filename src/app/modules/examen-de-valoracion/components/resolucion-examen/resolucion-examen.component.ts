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
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Experto } from '../../models/experto';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { Subject, timer } from 'rxjs';
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

    trabajoDeGradoId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;

    resolucionForm: FormGroup;

    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    codirectorSeleccionado: Experto;
    directorSeleccionado: Docente;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
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
        this.setBreadcrumb();
    }

    loadEditMode() {
        this.editMode = true;
        this.loadResolucion();
    }

    initForm(): void {
        this.resolucionForm = this.fb.group({
            idTrabajoGrados: [null, Validators.required],
            titulo: ['', Validators.required],
            director: ['', Validators.required],
            codirector: ['', Validators.required],
            numeroActaRevision: ['', Validators.required],
            fechaActa: [null, Validators.required],
            linkAnteproyectoAprobado: ['', Validators.required],
            linkSolicitudComite: ['', Validators.required],
            linkSolicitudConcejoFacultad: ['', Validators.required],
            numeroResolucionGeneradaCF: ['', Validators.required],
            fechaResolucion: [null, Validators.required],
            linkResolucionGeneradaCF: ['', Validators.required],
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
                    this.resolucionForm
                        .get('titulo')
                        .setValue(this.tituloSeleccionado);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.trabajoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.resolucionForm
                        .get('idTrabajoGrados')
                        .setValue(response.id);
                    this.trabajoDeGradoId = response.id;
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
    }

    setup(fieldName: string) {
        if (Object.keys(this.estudianteSeleccionado).length > 0) {
            this.solicitudService
                .getFile(this.resolucionForm.get(fieldName).value)
                .subscribe({
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
                            switch (fieldName) {
                                case 'linkAnteproyectoAprobado':
                                    this.FileAnteproyectoAprobado = file;
                                    break;
                                case 'linkSolicitudComite':
                                    this.FileSolicitudComite = file;
                                    break;
                                case 'linkSolicitudConcejoFacultad':
                                    this.FileSolicitudConcejo = file;
                                    break;
                                case 'linkResolucionGeneradaCF':
                                    this.FileResolucionConcejo = file;
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

    setValuesForm(resolucion: Resolucion) {
        this.resolucionForm.patchValue({
            ...resolucion,
        });
    }

    loadResolucion() {
        this.isLoading = true;
        this.resolucionService
            .getResolucionByTrabajo(this.trabajoDeGradoId)
            .subscribe({
                next: (response) => {
                    if (response) {
                        const data = response;
                        this.setValuesForm(data);
                        this.resolucionForm
                            .get('idTrabajoGrados')
                            .setValue(this.trabajoDeGradoId);
                        this.resolucionForm
                            .get('numeroActaRevision')
                            .setValue(Number(data?.numeroActaRevision));
                        this.resolucionForm
                            .get('numeroResolucionGeneradaCF')
                            .setValue(Number(data?.numeroResolucionGeneradaCF));
                        this.resolucionForm
                            .get('fechaActa')
                            .setValue(
                                data?.fechaActa
                                    ? new Date(data.fechaActa)
                                    : null
                            );
                        this.resolucionForm
                            .get('fechaResolucion')
                            .setValue(
                                data?.fechaActa
                                    ? new Date(data.fechaResolucion)
                                    : null
                            );
                    }
                },
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    this.setup('linkAnteproyectoAprobado');
                    this.setup('linkSolicitudComite');
                    this.setup('linkSolicitudConcejoFacultad');
                    this.setup('linkResolucionGeneradaCF');
                    this.isLoading = false;
                },
            });
    }

    updateResolucion(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.resolucionId = id;
        this.isLoading = true;
        this.resolucionService
            .updateResolucion(this.resolucionForm.value, this.resolucionId)
            .subscribe({
                next: (_) => {},
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    timer(2000).subscribe(() => {
                        this.isLoading = false;
                    });
                },
            });
    }

    createResolucion(): void {
        this.isLoading = true;
        this.resolucionService
            .createResolucion(this.resolucionForm.value)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.solicitudService.setResolucionSeleccionada(
                            response
                        );
                        timer(2000).subscribe(() => {
                            this.isLoading = false;
                            this.router.navigate([
                                `examen-de-valoracion/resolucion/editar/${response.idGeneracionResolucion}`,
                            ]);
                        });
                    }
                },
                error: (e) => this.handlerResponseException(e),
            });
    }

    createOrUpdateResolucion() {
        if (this.resolucionForm.invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }

        this.router.url.includes('editar')
            ? this.updateResolucion()
            : this.createResolucion();
    }

    ngOnDestroy() {
        this.unsubscribe_resolucion$.next();
        this.unsubscribe_resolucion$.complete();
    }

    onFileSelectFirst(event: any) {
        this.FileAnteproyectoAprobado = this.uploadFileAndSetValue(
            'linkAnteproyectoAprobado',
            event
        );
    }

    onFileSelectSecond(event: any) {
        this.FileSolicitudComite = this.uploadFileAndSetValue(
            'linkSolicitudComite',
            event
        );
    }

    onFileSelectThird(event: any) {
        this.FileSolicitudConcejo = this.uploadFileAndSetValue(
            'linkSolicitudConcejoFacultad',
            event
        );
    }

    onFileSelectFourth(event: any) {
        this.FileResolucionConcejo = this.uploadFileAndSetValue(
            'linkResolucionGeneradaCF',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'linkAnteproyectoAprobado') {
            this.FileAnteproyectoAprobado = null;
            this.AnteproyectoAprobado.clear();
            this.resolucionForm.get('linkAnteproyectoAprobado').reset();
        }
        if (field == 'linkSolicitudComite') {
            this.FileSolicitudComite = null;
            this.SolicitudComite.clear();
            this.resolucionForm.get('linkSolicitudComite').reset();
        }
        if (field == 'linkSolicitudConcejoFacultad') {
            this.FileSolicitudConcejo = null;
            this.SolicitudConcejo.clear();
            this.resolucionForm.get('linkSolicitudConcejoFacultad').reset();
        }
        if (field == 'linkResolucionGeneradaCF') {
            this.FileResolucionConcejo = null;
            this.ResolucionConcejo.clear();
            this.resolucionForm.get('linkResolucionGeneradaCF').reset();
        }
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

    uploadFileAndSetValue(fileControlName: string, event: any) {
        const selectedFiles: FileList = event.files;
        if (selectedFiles && selectedFiles.length > 0) {
            const selectedFile = selectedFiles[0];
            const fileType = selectedFile.type.split('/')[1];
            this.convertFileToBase64(selectedFile)
                .then((base64) => {
                    this.resolucionForm
                        .get(fileControlName)
                        .setValue(`${fileControlName}.${fileType}-${base64}`);
                })
                .catch((error) => {
                    console.error(
                        'Error al convertir el archivo a base64:',
                        error
                    );
                });
            return selectedFile;
        }
        return null;
    }

    getFileAndSetValue(fieldName: string) {
        this.solicitudService
            .getFile(this.resolucionForm.get(fieldName).value)
            .subscribe({
                next: (response: string) => {
                    const rutaArchivo =
                        this.resolucionForm.get(fieldName).value;
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
                    a.download = fieldName + `.${extension}`;
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

    mapDirectorLabel(docente: Docente) {
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

    mapCodirector(experto: any) {
        return {
            id: experto.id,
            nombre: experto.nombre,
            apellido: experto.apellido,
            correo: experto.correo,
            universidad: experto.universidad,
        };
    }

    onSeleccionarDirector() {
        const ref = this.showBuscadorDocentes();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const director = this.mapDirectorLabel(response);
                    this.directorSeleccionado = director;
                    this.director.setValue(director.id);
                }
            },
        });
    }

    onSeleccionarCodirector() {
        const ref = this.showBuscadorExpertos();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const coodirector = this.mapCodirector(response);
                    this.codirectorSeleccionado = coodirector;
                    this.codirector.setValue(coodirector.id);
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

    redirectToSolicitud(trabajoDeGradoId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${trabajoDeGradoId}`,
        ]);
    }

    redirectToRespuesta(respuestaId: number) {
        respuestaId
            ? this.router.navigate([
                  `examen-de-valoracion/respuesta/editar/${respuestaId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/respuesta']);
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
        // if (response.status != 501) return;
        // const mapException = mapResponseException(response.error);
        // mapException.forEach((value, _) => {
        //     this.messageService.add(errorMessage(value));
        // });
        this.messageService.add(
            errorMessage(response.error ? response.error : response)
        );
    }

    isActiveIndex(): Boolean {
        if (this.router.url.includes('resolucion')) {
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
