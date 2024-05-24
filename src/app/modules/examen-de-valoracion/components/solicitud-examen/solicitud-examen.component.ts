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
    EMPTY,
    Subject,
    catchError,
    debounceTime,
    distinctUntilChanged,
    filter,
    finalize,
    switchMap,
    take,
    takeUntil,
    tap,
    throwError,
    timer,
} from 'rxjs';
import { Solicitud } from '../../models/solicitud';
import { FileUpload } from 'primeng/fileupload';
import { DocenteService } from 'src/app/modules/gestion-docentes/services/docente.service';
import { ExpertoService } from 'src/app/shared/services/experto.service';
import { AuthService } from '../../services/auth.service';

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

    private unsubscribe_solicitud$ = new Subject<void>();

    trabajoDeGradoId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;
    role: string[];

    isLoading: boolean;
    editMode: boolean = false;
    isSolicitudValid: boolean;

    solicitudForm: FormGroup;
    estudianteSeleccionado: Estudiante = {};
    evaluadorInternoSeleccionado: Docente;
    evaluadorExternoSeleccionado: Experto;

    selectedFileFirst: File | null;
    selectedFileSecond: File | null;
    selectedFileThird: File | null;
    selectedFileFourth: File | null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private solicitudService: SolicitudService,
        private authService: AuthService,
        private docenteService: DocenteService,
        private expertoService: ExpertoService
    ) {}

    get evaluadorExterno(): FormControl {
        return this.solicitudForm.get('evaluadorExterno') as FormControl;
    }

    get evaluadorInterno(): FormControl {
        return this.solicitudForm.get('evaluadorInterno') as FormControl;
    }

    ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        if (this.router.url.includes('editar')) {
            this.loadEditMode();
        }
        this.setBreadcrumb();
    }

    initForm(): void {
        this.solicitudForm = this.fb.group({
            idTrabajoGrados: [null],
            titulo: [null, Validators.required],
            linkFormatoA: [null, Validators.required],
            linkFormatoD: [null, Validators.required],
            linkFormatoE: [null, Validators.required],
            evaluadorExterno: [null, Validators.required],
            evaluadorInterno: [null, Validators.required],
            actaAprobacionExamen: [null, Validators.required],
            fechaActa: [null, Validators.required],
            linkOficioDirigidoEvaluadores: [null, Validators.required],
            fechaMaximaEvaluacion: [null, Validators.required],
        });

        this.formReady.emit(this.solicitudForm);
    }

    updateFormFields(role: string[]): void {
        if (role.includes('ROLE_DOCENTE')) {
            this.solicitudForm.get('titulo').enable();
            this.solicitudForm.get('linkFormatoA').enable();
            this.solicitudForm.get('linkFormatoD').enable();
            this.solicitudForm.get('linkFormatoE').enable();
            this.solicitudForm.get('evaluadorExterno').enable();
            this.solicitudForm.get('evaluadorInterno').enable();

            this.solicitudForm.get('actaAprobacionExamen').disable();
            this.solicitudForm.get('fechaActa').disable();
            this.solicitudForm.get('linkOficioDirigidoEvaluadores').disable();
            this.solicitudForm.get('fechaMaximaEvaluacion').disable();
        }
        if (role.includes('ROLE_COORDINADOR')) {
            this.solicitudForm.get('titulo').enable();
            this.solicitudForm.get('linkFormatoA').enable();
            this.solicitudForm.get('linkFormatoD').enable();
            this.solicitudForm.get('linkFormatoE').enable();
            this.solicitudForm.get('evaluadorExterno').enable();
            this.solicitudForm.get('evaluadorInterno').enable();
            this.solicitudForm.get('actaAprobacionExamen').enable();
            this.solicitudForm.get('fechaActa').enable();
            this.solicitudForm.get('linkOficioDirigidoEvaluadores').enable();
            this.solicitudForm.get('fechaMaximaEvaluacion').enable();
        }
    }

    subscribeToObservers() {
        this.role = this.authService.getRole();
        this.updateFormFields(this.role);

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
        this.solicitudService.trabajoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.solicitudForm
                        .get('idTrabajoGrados')
                        .setValue(response.id);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.respuestaSeleccionadaSubject$.subscribe(
            (response) => {
                if (response) {
                    this.respuestaId = response.id;
                }
            }
        );
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
        if (!this.router.url.includes('editar')) {
            this.solicitudForm.valueChanges.subscribe((value) => {
                localStorage.setItem(
                    'solicitudFormState',
                    JSON.stringify(value)
                );
            });

            const savedState = localStorage.getItem('solicitudFormState');
            if (savedState) {
                const data = JSON.parse(savedState);
                this.setValuesForm(data);
                this.setDateField('fechaActa', data?.fechaActa);
                this.setDateField(
                    'fechaMaximaEvaluacion',
                    data?.fechaMaximaEvaluacion
                );

                this.processFileField('linkFormatoA', data.linkFormatoA);
                this.processFileField('linkFormatoD', data.linkFormatoD);
                this.processFileField('linkFormatoE', data.linkFormatoE);
                this.processFileField(
                    'linkOficioDirigidoEvaluadores',
                    data.linkOficioDirigidoEvaluadores
                );
            }
        }
    }

    private processFileField(fieldName: string, fieldValue: string) {
        if (fieldValue) {
            const base64 = fieldValue.slice(fieldValue.indexOf('-') + 1);
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const file = new File([byteArray], fieldName);
            switch (fieldName) {
                case 'linkFormatoA':
                    this.selectedFileFirst = file;
                    break;
                case 'linkFormatoD':
                    this.selectedFileSecond = file;
                    break;
                case 'linkFormatoE':
                    this.selectedFileThird = file;
                    break;
                case 'linkOficioDirigidoEvaluadores':
                    this.selectedFileFourth = file;
                    break;
                default:
                    break;
            }
        }
    }

    private setDateField(fieldName: string, dateValue: string) {
        this.solicitudForm
            .get(fieldName)
            .setValue(dateValue ? new Date(dateValue) : null);
    }

    updateSolicitudExamen(): void {
        if (this.solicitudForm.invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }
        this.isLoading = true;
        if (this.role.includes('ROLE_DOCENTE')) {
            this.solicitudService
                .updateSolicitudDocente(
                    this.solicitudForm.value,
                    this.trabajoDeGradoId
                )
                .subscribe({
                    next: (_) => {},
                    error: (e) => {
                        console.error(
                            'Error al actualizar los datos en el backend:',
                            e
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

        if (this.role.includes('ROLE_COORDINADOR')) {
            this.solicitudService
                .updateSolicitudCoordinador(
                    this.solicitudForm.value,
                    this.trabajoDeGradoId
                )
                .subscribe({
                    next: (_) => {},
                    error: (e) => {
                        console.error(
                            'Error al actualizar los datos en el backend:',
                            e
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

    createSolicitudExamen(): void {
        if (this.solicitudForm.invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }
        this.isLoading = true;
        this.solicitudService
            .createTrabajoDeGrado(this.estudianteSeleccionado.id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.solicitudService.setTrabajoSeleccionado(response);
                        this.solicitudForm
                            .get('idTrabajoGrados')
                            .setValue(response.id);
                    }
                },
                error: (e) => {
                    console.error(
                        'Error al guardar los datos en el backend:',
                        e
                    );
                    if (!this.role.includes('ROLE_DOCENTE')) {
                        this.router.navigate(['examen-de-valoracion']);
                        this.messageService.add(
                            warnMessage('Usuario no permitido.')
                        );
                    }
                },
                complete: () => {
                    if (this.role.includes('ROLE_DOCENTE')) {
                        // TODO
                        this.solicitudService
                            .createSolicitudDocente(this.solicitudForm.value)
                            .subscribe({
                                next: (_) => {},
                                error: (e) => {
                                    console.error(
                                        'Error al guardar los datos en el backend:',
                                        e
                                    );
                                },
                                complete: () => {
                                    localStorage.removeItem(
                                        'solicitudFormState'
                                    );
                                    timer(2000).subscribe(() => {
                                        this.isLoading = false;
                                        this.router.navigate([
                                            'examen-de-valoracion',
                                        ]);
                                    });
                                },
                            });
                    } else {
                        this.router.navigate(['examen-de-valoracion']);
                    }
                },
            });
    }

    setup(fieldName: string) {
        if (Object.keys(this.estudianteSeleccionado).length > 0) {
            this.solicitudService
                .getFile(this.solicitudForm.get(fieldName).value)
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
                                case 'linkFormatoA':
                                    this.selectedFileFirst = file;
                                    break;
                                case 'linkFormatoD':
                                    this.selectedFileSecond = file;
                                    break;
                                case 'linkFormatoE':
                                    this.selectedFileThird = file;
                                    break;
                                case 'linkOficioDirigidoEvaluadores':
                                    this.selectedFileFourth = file;
                                    break;
                                default:
                                    break;
                            }
                        }
                    },
                    error: (e) => {
                        console.log(e);
                        this.messageService.add(
                            warnMessage('Pendiente subir archivos.')
                        );
                    },
                });
        }
    }

    loadEditMode() {
        this.editMode = true;
        this.loadSolicitud();
    }

    setValuesForm(solicitud: Solicitud) {
        this.solicitudForm.patchValue({
            ...solicitud,
        });
    }

    loadSolicitud() {
        this.isLoading = true;
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.trabajoDeGradoId = id;
        this.solicitudService.getSolicitudCoordinador(id).subscribe({
            next: (response) => {
                if (response) {
                    console.log(response);
                    const data = response;
                    this.solicitudService.setTituloSeleccionadoSubject(
                        data.titulo
                    );
                    this.setValuesForm(data);
                    this.solicitudForm.get('idTrabajoGrados').setValue(id);
                    this.docenteService
                        .getDocente(response.evaluadorInterno)
                        .subscribe({
                            next: (response) => {
                                console.log(response);
                                this.evaluadorInternoSeleccionado =
                                    this.mapEvaluadorInternoLabel(response);
                                this.solicitudService.setEvaluadorInternoSeleccionadoSubject(
                                    this.evaluadorInternoSeleccionado
                                );
                                this.evaluadorInterno.setValue(response.id);
                            },
                        });
                    this.expertoService
                        .getExperto(response.evaluadorExterno)
                        .subscribe({
                            next: (response) => {
                                console.log(response);
                                this.evaluadorExternoSeleccionado =
                                    this.mapEvaluadorExternoLabel(response);
                                this.solicitudService.setEvaluadorExternoSeleccionadoSubject(
                                    this.evaluadorExternoSeleccionado
                                );
                                this.evaluadorExterno.setValue(response.id);
                            },
                        });
                    this.solicitudForm
                        .get('actaAprobacionExamen')
                        .setValue(Number(data?.actaAprobacionExamen));
                    this.solicitudForm
                        .get('fechaActa')
                        .setValue(
                            data?.fechaActa ? new Date(data.fechaActa) : null
                        );
                    this.solicitudForm
                        .get('fechaMaximaEvaluacion')
                        .setValue(
                            data?.fechaMaximaEvaluacion
                                ? new Date(data.fechaMaximaEvaluacion)
                                : null
                        );
                }
            },
            error: (e) => this.handlerResponseException(e),
            complete: () => {
                this.isSolicitudValid = true;

                if (
                    this.role.includes('ROLE_DOCENTE') &&
                    !this.role.includes('ROLE_COORDINADOR')
                ) {
                    this.setup('linkFormatoA');
                    this.setup('linkFormatoD');
                    this.setup('linkFormatoE');
                }

                if (
                    this.role.includes('ROLE_COORDINADOR') &&
                    !this.role.includes('ROLE_DOCENTE')
                ) {
                    this.setup('linkFormatoA');
                    this.setup('linkFormatoD');
                    this.setup('linkFormatoE');
                    this.setup('linkOficioDirigidoEvaluadores');
                }
                this.isLoading = false;
            },
        });
    }

    ngOnDestroy() {
        this.unsubscribe_solicitud$.next();
        this.unsubscribe_solicitud$.complete();
    }

    onFileSelectFirst(event: any) {
        this.selectedFileFirst = this.uploadFileAndSetValue(
            'linkFormatoA',
            event
        );
    }

    onFileSelectSecond(event: any) {
        this.selectedFileSecond = this.uploadFileAndSetValue(
            'linkFormatoD',
            event
        );
    }

    onFileSelectThird(event: any) {
        this.selectedFileThird = this.uploadFileAndSetValue(
            'linkFormatoE',
            event
        );
    }

    onFileSelectFourth(event: any) {
        this.selectedFileFourth = this.uploadFileAndSetValue(
            'linkOficioDirigidoEvaluadores',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'linkFormatoA') {
            this.selectedFileFirst = null;
            this.fileUpload1.clear();
            this.solicitudForm.get('linkFormatoA').reset();
        }
        if (field == 'linkFormatoD') {
            this.selectedFileSecond = null;
            this.fileUpload2.clear();
            this.solicitudForm.get('linkFormatoD').reset();
        }
        if (field == 'linkFormatoE') {
            this.selectedFileThird = null;
            this.fileUpload3.clear();
            this.solicitudForm.get('linkFormatoE').reset();
        }
        if (field == 'linkOficioDirigidoEvaluadores') {
            this.selectedFileFourth = null;
            this.fileUpload4.clear();
            this.solicitudForm.get('linkOficioDirigidoEvaluadores').reset();
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
                    this.solicitudForm
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
            .getFile(this.solicitudForm.get(fieldName).value)
            .subscribe({
                next: (response: string) => {
                    const rutaArchivo = this.solicitudForm.get(fieldName).value;
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

    getFormControl(formControlName: string): FormControl {
        return this.solicitudForm.get(formControlName) as FormControl;
    }

    showBuscadorEvaluadorInterno() {
        return this.dialogService.open(BuscadorDocentesComponent, {
            header: 'Seleccionar docente',
            width: '60%',
        });
    }

    showBuscadorEvaluadorExterno() {
        return this.dialogService.open(BuscadorExpertosComponent, {
            header: 'Seleccionar experto',
            width: '60%',
        });
    }

    onSeleccionarEvaluadorInterno() {
        const ref = this.showBuscadorEvaluadorInterno();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const docente = this.mapEvaluadorInternoLabel(response);
                    this.evaluadorInternoSeleccionado = docente;
                    this.solicitudService.setEvaluadorInternoSeleccionadoSubject(
                        this.evaluadorInternoSeleccionado
                    );
                    this.evaluadorInterno.setValue(docente.id);
                }
            },
        });
    }

    onSeleccionarEvaluadorExterno() {
        const ref = this.showBuscadorEvaluadorExterno();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const experto = this.mapEvaluadorExternoLabel(response);
                    this.evaluadorExternoSeleccionado = experto;
                    this.solicitudService.setEvaluadorExternoSeleccionadoSubject(
                        this.evaluadorExternoSeleccionado
                    );
                    this.evaluadorExterno.setValue(experto.id);
                }
            },
        });
    }

    onCrearDocumento() {
        this.solicitudService.setTituloSeleccionadoSubject(
            this.solicitudForm.get('titulo').value
        );
        this.router.navigate(['examen-de-valoracion/solicitud/crear']);
    }

    limpiarEvaluadorExterno() {
        this.evaluadorExterno.setValue(null);
        this.evaluadorExternoSeleccionado = null;
    }

    limpiarEvaluadorInterno() {
        this.evaluadorInterno.setValue(null);
        this.evaluadorInternoSeleccionado = null;
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

    mapEvaluadorInternoLabel(docente: Docente) {
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

    mapEvaluadorExternoLabel(experto: any) {
        return {
            id: experto.id,
            nombre: experto.nombre ? experto.nombre : experto.persona.nombre,
            apellido: experto.apellido
                ? experto.apellido
                : experto.persona.apellido,
            correo: experto.correo
                ? experto.correo
                : experto.persona.correoElectronico,
            universidad: experto.universidad,
        };
    }

    isActiveIndex(): Boolean {
        if (this.router.url.includes('solicitud')) {
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
