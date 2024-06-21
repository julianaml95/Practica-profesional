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
import { v4 as uuidv4 } from 'uuid';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { Aviso, EstadoProceso, Mensaje } from 'src/app/core/enums/enums';
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
import { Subscription, forkJoin, lastValueFrom, of, timer } from 'rxjs';
import { Solicitud } from '../../models/solicitud';
import { FileUpload } from 'primeng/fileupload';
import { DocenteService } from 'src/app/shared/services/docente.service';
import { ExpertoService } from 'src/app/shared/services/experto.service';
import { AuthService } from '../../services/auth.service';
import { RespuestaService } from '../../services/respuesta.service';
import { ResolucionService } from '../../services/resolucion.service';
import { SustentacionService } from '../../services/sustentacion.service';

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

    private trabajoSeleccionadoSubscription: Subscription;

    trabajoDeGradoId: number;
    solicitudId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;
    currentPdfIndex: number = 0;

    role: string[];
    estado: string;

    displayModal: boolean = false;
    errorMessageShown: boolean = false;
    editMode: boolean = false;
    isLoading: boolean;
    isDocenteValid: boolean = false;
    isCoordinadorFase1Valid: boolean = false;
    isCoordinadorFase2Valid: boolean = false;
    isReviewed: boolean = false;
    isPdfLoaded: boolean = false;
    isRespuestaValid: boolean = false;
    isResolucionValid: boolean = false;
    isSustentacionValid: boolean = false;

    solicitudForm: FormGroup;
    estudianteSeleccionado: Estudiante = {};
    evaluadorInternoSeleccionado: Docente;
    evaluadorExternoSeleccionado: Experto;

    formatoB: File | null;
    formatoC: File | null;
    selectedFileFirst: File | null;
    selectedFileSecond: File | null;
    selectedFileThird: File | null;
    selectedFileFourth: File | null;
    anexosFiles: File[] = [];
    anexosBase64: { linkAnexo: string }[] = [];
    pdfUrls: { name: string; url: string }[] = [];

    displayFormatoB: boolean = false;
    currentFormat: 'formatoB' | 'formatoC' = 'formatoB';

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private solicitudService: SolicitudService,
        private respuestaService: RespuestaService,
        private resolucionService: ResolucionService,
        private sustentacionService: SustentacionService,
        private authService: AuthService,
        private docenteService: DocenteService,
        private expertoService: ExpertoService
    ) {}

    get evaluadorExterno(): FormControl {
        return this.solicitudForm.get('idEvaluadorExterno') as FormControl;
    }

    get evaluadorInterno(): FormControl {
        return this.solicitudForm.get('idEvaluadorInterno') as FormControl;
    }

    async ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        if (this.router.url.includes('editar')) {
            await this.loadEditMode();
        } else {
            this.checkEstados();
        }
        this.setBreadcrumb();
    }

    async loadEditMode() {
        this.editMode = true;
        await this.loadSolicitud();
        this.checkEstados();
    }

    initForm(): void {
        this.solicitudForm = this.fb.group({
            idTrabajoGrados: [null],
            titulo: [null, Validators.required],
            linkFormatoA: [null, Validators.required],
            linkFormatoD: [null, Validators.required],
            linkFormatoE: [null, Validators.required],
            anexos: [[], Validators.required],
            idEvaluadorExterno: [null, Validators.required],
            idEvaluadorInterno: [null, Validators.required],
            numeroActa: [null, Validators.required],
            fechaActa: [null, Validators.required],
            linkOficioDirigidoEvaluadores: [null, Validators.required],
            fechaMaximaEvaluacion: [null, Validators.required],
        });

        this.formReady.emit(this.solicitudForm);
    }

    updateFormFields(role: string[]): void {
        const formControls = this.solicitudForm.controls;

        for (const control in formControls) {
            formControls[control].disable();
        }

        formControls['idTrabajoGrados'].enable();

        if (role.includes('ROLE_DOCENTE')) {
            this.solicitudForm.get('titulo').enable();
            this.solicitudForm.get('linkFormatoA').enable();
            this.solicitudForm.get('linkFormatoD').enable();
            this.solicitudForm.get('linkFormatoE').enable();
            this.solicitudForm.get('anexos').enable();
            this.solicitudForm.get('idEvaluadorExterno').enable();
            this.solicitudForm.get('idEvaluadorInterno').enable();
        }

        if (role.includes('ROLE_COORDINADOR')) {
            if (this.isDocenteValid == true) {
                this.solicitudForm.get('numeroActa').enable();
                this.solicitudForm.get('fechaActa').enable();
                this.solicitudForm
                    .get('linkOficioDirigidoEvaluadores')
                    .enable();
                this.solicitudForm.get('fechaMaximaEvaluacion').enable();
            }
        }
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
        this.trabajoSeleccionadoSubscription =
            this.solicitudService.trabajoSeleccionadoSubject$.subscribe({
                next: (response) => {
                    if (response) {
                        this.estado = response.estado;
                        this.solicitudForm
                            .get('idTrabajoGrados')
                            .setValue(response.id);
                    }
                },
                error: (e) => this.handlerResponseException(e),
            });
        this.solicitudService.solicitudSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.solicitudId = response.idExamenValoracion;
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
        this.solicitudService.respuestaValid$.subscribe({
            next: (response) => {
                if (response) {
                    this.isRespuestaValid = response;
                } else {
                    const id = Number(this.route.snapshot.paramMap.get('id'));
                    if (id) {
                        this.respuestaService
                            .getRespuestasExamen(id)
                            .subscribe({
                                next: (response) => {
                                    if (
                                        response?.evaluador_externo &&
                                        response?.evaluador_interno
                                    ) {
                                        this.isRespuestaValid = true;
                                    }
                                },
                                error: (e) => {
                                    this.handlerResponseException(e);
                                },
                            });
                    }
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.resolucionValid$.subscribe({
            next: (response) => {
                if (response) {
                    this.isResolucionValid = response;
                } else {
                    const id = Number(this.route.snapshot.paramMap.get('id'));
                    if (id) {
                        this.resolucionService
                            .getResolucionCoordinadorFase3(id)
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
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.sustentacionValid$.subscribe({
            next: (response) => {
                if (response) {
                    this.isSustentacionValid = response;
                } else {
                    const id = Number(this.route.snapshot.paramMap.get('id'));
                    if (id) {
                        this.sustentacionService
                            .getSustentacionCoordinadorFase3(id)
                            .subscribe({
                                next: (response) => {
                                    if (
                                        response?.numeroActaFinal &&
                                        response?.fechaActaFinal
                                    ) {
                                        this.isSustentacionValid = true;
                                    }
                                },
                                error: (e) => {
                                    this.handlerResponseException(e);
                                },
                            });
                    }
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
                if (data?.evaluadorExterno) {
                    this.expertoService
                        .obtenerExperto(data?.evaluadorExterno?.id)
                        .subscribe({
                            next: (response) => {
                                this.evaluadorExternoSeleccionado =
                                    this.mapEvaluadorExternoLabel(response);
                                this.solicitudService.setEvaluadorExternoSeleccionadoSubject(
                                    this.evaluadorExternoSeleccionado
                                );
                                this.evaluadorExterno.setValue(response.id);
                            },
                        });
                }
                if (data?.evaluadorInterno) {
                    this.docenteService
                        .obtenerDocente(data?.evaluadorInterno?.id)
                        .subscribe({
                            next: (response) => {
                                this.evaluadorInternoSeleccionado =
                                    this.mapEvaluadorInternoLabel(response);
                                this.solicitudService.setEvaluadorInternoSeleccionadoSubject(
                                    this.evaluadorInternoSeleccionado
                                );
                                this.evaluadorInterno.setValue(response.id);
                            },
                        });
                }
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

    ngOnDestroy() {
        if (this.trabajoSeleccionadoSubscription) {
            this.trabajoSeleccionadoSubscription.unsubscribe();
        }
    }

    checkEstados() {
        switch (this.estado) {
            case EstadoProceso.SIN_REGISTRAR_SOLICITUD_EXAMEN_DE_VALORACION:
                this.isDocenteValid = false;
                this.isCoordinadorFase1Valid = false;
                this.isCoordinadorFase2Valid = false;
                break;
            case EstadoProceso.PENDIENTE_REVISION_COORDINADOR:
                this.isDocenteValid = false;
                this.isCoordinadorFase1Valid = false;
                this.isCoordinadorFase2Valid = false;
                break;
            case EstadoProceso.DEVUELTO_EXAMEN_DE_VALORACION_POR_COORDINADOR:
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: EstadoProceso.DEVUELTO_EXAMEN_DE_VALORACION_POR_COORDINADOR,
                    life: 4000,
                });
                this.isDocenteValid = false;
                this.isCoordinadorFase1Valid = false;
                this.isCoordinadorFase2Valid = false;
                break;
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR:
                this.isDocenteValid = true;
                this.isCoordinadorFase1Valid = false;
                this.isCoordinadorFase2Valid = false;
                break;
            case EstadoProceso.DEVUELTO_EXAMEN_DE_VALORACION_POR_COMITE:
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: EstadoProceso.DEVUELTO_EXAMEN_DE_VALORACION_POR_COMITE,
                    life: 4000,
                });
                this.isDocenteValid = true;
                this.isCoordinadorFase1Valid = false;
                this.isCoordinadorFase2Valid = false;
                break;
            case EstadoProceso.PENDIENTE_RESULTADO_EXAMEN_DE_VALORACION:
                this.isDocenteValid = true;
                this.isCoordinadorFase1Valid = true;
                this.isCoordinadorFase2Valid = true;
                break;
            default:
                this.isDocenteValid = true;
                this.isCoordinadorFase1Valid = true;
                this.isCoordinadorFase2Valid = true;
                break;
        }

        this.updateFormFields(this.role);
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

    //#region PDF VIEWER
    async loadPdfFiles() {
        const filesToConvert = [
            this.selectedFileFirst,
            this.selectedFileSecond,
            this.selectedFileThird,
            this.selectedFileFourth,
            this.formatoB,
            this.formatoC,
            ...this.anexosFiles,
        ];

        const errorFiles = new Set<File>();

        try {
            for (const file of filesToConvert) {
                if (file) {
                    try {
                        const url = URL.createObjectURL(file);
                        this.pdfUrls.push({ name: file.name, url });
                    } catch (error) {
                        errorFiles.add(file);
                    }
                }
            }

            if (errorFiles.size > 0) {
                this.messageService.add(
                    errorMessage('Error al convertir uno o más archivos PDF.')
                );
                this.closeModal();
            }
        } catch (generalError) {
            this.messageService.add(
                errorMessage(
                    'Se produjo un error general al cargar los archivos PDF.'
                )
            );
            this.closeModal();
        }
    }

    onPdfLoad(pdf: any) {
        if (pdf.numPages) {
            this.isPdfLoaded = true;
            console.log(`PDF loaded with ${pdf.numPages} pages.`);
        } else {
            this.isPdfLoaded = false;
            console.error('Failed to load PDF.');
        }
    }

    nextPdf() {
        if (this.currentPdfIndex < this.pdfUrls.length - 1) {
            this.isPdfLoaded = false; // Reset the flag when changing PDF
            this.currentPdfIndex++;
        }
    }

    previousPdf() {
        if (this.currentPdfIndex > 0) {
            this.isPdfLoaded = false; // Reset the flag when changing PDF
            this.currentPdfIndex--;
        }
    }

    openModal() {
        if (!this.isLoading) {
            this.displayModal = true;
            this.loadPdfFiles();
        }
    }

    closeModal() {
        this.displayModal = false;
        this.pdfUrls = [];
    }
    //#endregion

    //#region Modal FormatoB and FormatoC
    showFormatoB() {
        this.displayFormatoB = true;
        this.currentFormat = 'formatoB';
    }

    nextFormat() {
        if (this.currentFormat === 'formatoB') {
            this.currentFormat = 'formatoC';
        } else {
            this.displayFormatoB = false;
        }
    }

    handleFormatoBPdfGenerated(pdfBlob: Blob) {
        const pdfFile = new File([pdfBlob], 'formatoB.pdf', {
            type: 'application/pdf',
        });
        this.formatoB = pdfFile;
    }

    handleFormatoCPdfGenerated(pdfBlob: Blob) {
        const pdfFile = new File([pdfBlob], 'formatoC.pdf', {
            type: 'application/pdf',
        });
        this.formatoC = pdfFile;
    }
    //#endregion

    //#region Anexos
    onUpload(event) {
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
                    this.solicitudForm.patchValue({
                        anexos: this.anexosBase64,
                    });
                })
                .catch((error) => {
                    console.error(
                        'Error al convertir el archivo a base64:',
                        error
                    );
                });
        }
    }

    removeFile(index: number) {
        this.anexosFiles.splice(index, 1);
        this.anexosBase64.splice(index, 1);
    }
    //#endregion

    async updateSolicitudExamen() {
        if (this.solicitudForm.invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }

        this.isLoading = true;

        try {
            if (this.role.includes('ROLE_DOCENTE')) {
                await lastValueFrom(
                    this.solicitudService.updateSolicitudDocente(
                        this.solicitudForm.value,
                        this.solicitudId
                    )
                );
            }

            if (this.role.includes('ROLE_COORDINADOR')) {
                if (
                    this.isCoordinadorFase2Valid &&
                    this.isCoordinadorFase1Valid &&
                    this.isDocenteValid
                ) {
                    await lastValueFrom(
                        this.solicitudService.updateSolicitudCoordinador(
                            this.solicitudForm.value,
                            this.solicitudId
                        )
                    );
                } else if (
                    !this.isCoordinadorFase2Valid &&
                    !this.isCoordinadorFase1Valid &&
                    !this.isDocenteValid
                ) {
                    const solicitudData = this.isReviewed
                        ? {
                              idExamenValoracion: this.trabajoDeGradoId,
                              conceptoCoordinadorDocumentos: 'Aprobado',
                          }
                        : {
                              idExamenValoracion: this.trabajoDeGradoId,
                              conceptoCoordinadorDocumentos: 'No Aprobado',
                          };
                    await lastValueFrom(
                        this.solicitudService.createSolicitudCoordinadorFase1(
                            solicitudData
                        )
                    );
                } else if (
                    !this.isCoordinadorFase2Valid &&
                    !this.isCoordinadorFase1Valid &&
                    this.isDocenteValid
                ) {
                    const formatoD = await this.formatFileString(
                        this.selectedFileSecond,
                        'linkFormatoD'
                    );
                    const formatoE = await this.formatFileString(
                        this.selectedFileThird,
                        'linkFormatoE'
                    );
                    const anexos = await this.formatFileString(
                        this.anexosFiles,
                        'anexos'
                    );

                    if (!this.formatoB || !this.formatoC) {
                        this.isLoading = false;
                        return this.messageService.add(
                            warnMessage('Error: formatos B y C son requeridos.')
                        );
                    }

                    const formatoB = await this.formatFileString(
                        this.formatoB,
                        'formatoB'
                    );
                    const formatoC = await this.formatFileString(
                        this.formatoC,
                        'formatoC'
                    );

                    const { numeroActa, fechaActa, ...restOfFormValues } =
                        this.solicitudForm.value;

                    const solicitudData = {
                        ...restOfFormValues,
                        actaFechaRespuestaComite: [
                            {
                                conceptoComite: 'Aprobado',
                                numeroActa: numeroActa,
                                fechaActa: fechaActa,
                            },
                        ],
                        envioEmailDto: {
                            asunto: 'Envio evaluadores',
                            mensaje: 'Buenos dias, envio documentos',
                        },
                        informacionEnvioEvaluador: {
                            formatoD,
                            formatoE,
                            anexos,
                            formatoB,
                            formatoC,
                        },
                    };
                    await lastValueFrom(
                        this.solicitudService.createSolicitudCoordinadorFase2(
                            solicitudData
                        )
                    );
                }
            }

            this.isLoading = false;
            this.messageService.add(infoMessage(Mensaje.ACTUALIZACION_EXITOSA));
            this.router.navigate(['examen-de-valoracion']);
        } catch (e) {
            this.isLoading = false;
            this.messageService.add(
                errorMessage('Error al actualizar los datos en el backend')
            );
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
                },
                complete: () => {
                    if (this.role.includes('ROLE_DOCENTE') == true) {
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
                                    this.messageService.add(
                                        infoMessage(Mensaje.GUARDADO_EXITOSO)
                                    );
                                    timer(2000).subscribe(() => {
                                        this.isLoading = false;
                                        this.router.navigate([
                                            'examen-de-valoracion',
                                        ]);
                                    });
                                },
                            });
                    }
                },
            });
    }

    setup(fieldName: string) {
        if (Object.keys(this.estudianteSeleccionado).length > 0) {
            if (fieldName == 'anexos') {
                for (let anexo of this.solicitudForm.get(fieldName).value) {
                    this.solicitudService.getFile(anexo.linkAnexo).subscribe({
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
                                this.anexosFiles.push(file);
                            }
                        },
                        error: (e) => {
                            if (!this.errorMessageShown) {
                                this.messageService.add(
                                    warnMessage('Pendiente subir archivos.')
                                );
                                this.errorMessageShown = true;
                            }
                        },
                    });
                }
                return;
            }
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
                        if (!this.errorMessageShown) {
                            this.messageService.add(
                                warnMessage('Pendiente subir archivos.')
                            );
                            this.errorMessageShown = true;
                        }
                    },
                });
        }
    }

    setValuesForm(solicitud: Solicitud) {
        this.solicitudForm.patchValue({
            ...solicitud,
        });
        this.solicitudForm
            .get('idTrabajoGrados')
            .setValue(this.trabajoDeGradoId);
    }

    loadSolicitud() {
        return new Promise<void>((resolve, reject) => {
            const id = Number(this.route.snapshot.paramMap.get('id'));
            this.isLoading = true;
            this.trabajoDeGradoId = id;

            const docenteObs = this.solicitudService.getSolicitudDocente(
                this.trabajoDeGradoId
            );

            const coordinadorObs = this.role.includes('ROLE_COORDINADOR')
                ? this.solicitudService.getSolicitudCoordinador(
                      this.trabajoDeGradoId
                  )
                : of(null);

            forkJoin({
                docente: docenteObs,
                coordinador: coordinadorObs,
            }).subscribe({
                next: (responses) => {
                    if (responses.docente) {
                        const data = responses.docente;
                        this.solicitudService.setTituloSeleccionadoSubject(
                            data.titulo
                        );
                        this.setValuesForm(data);

                        this.evaluadorInternoSeleccionado =
                            this.mapEvaluadorInternoLabel(
                                data.evaluadorInterno
                            );
                        this.solicitudService.setEvaluadorInternoSeleccionadoSubject(
                            this.evaluadorInternoSeleccionado
                        );
                        this.evaluadorInterno.setValue(
                            data.evaluadorInterno.id
                        );

                        this.evaluadorExternoSeleccionado =
                            this.mapEvaluadorExternoLabel(
                                data.evaluadorExterno
                            );
                        this.solicitudService.setEvaluadorExternoSeleccionadoSubject(
                            this.evaluadorExternoSeleccionado
                        );
                        this.evaluadorExterno.setValue(
                            data.evaluadorExterno.id
                        );
                    }

                    if (responses.coordinador) {
                        const data = responses.coordinador;
                        this.solicitudService.setTituloSeleccionadoSubject(
                            data.titulo
                        );
                        this.setValuesForm(data);

                        this.expertoService
                            .obtenerExperto(data?.evaluadorExterno.id)
                            .subscribe({
                                next: (response) => {
                                    this.evaluadorExternoSeleccionado =
                                        this.mapEvaluadorExternoLabel(response);
                                    this.solicitudService.setEvaluadorExternoSeleccionadoSubject(
                                        this.evaluadorExternoSeleccionado
                                    );
                                    this.evaluadorExterno.setValue(response.id);
                                },
                            });

                        this.docenteService
                            .obtenerDocente(data?.evaluadorInterno.id)
                            .subscribe({
                                next: (response) => {
                                    this.evaluadorInternoSeleccionado =
                                        this.mapEvaluadorInternoLabel(response);
                                    this.solicitudService.setEvaluadorInternoSeleccionadoSubject(
                                        this.evaluadorInternoSeleccionado
                                    );
                                    this.evaluadorInterno.setValue(response.id);
                                },
                            });

                        const lastIdx: number =
                            data.actaFechaRespuestaComite.length - 1;
                        const lastActa = data.actaFechaRespuestaComite[lastIdx];

                        const actaDate = lastActa?.fechaActa;
                        const actaNumber = lastActa?.numeroActa;

                        this.solicitudForm
                            .get('fechaActa')
                            .setValue(actaDate ? new Date(actaDate) : null);

                        this.solicitudForm
                            .get('numeroActa')
                            .setValue(actaNumber ? actaNumber : null);

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
                    if (this.role.includes('ROLE_DOCENTE')) {
                        this.setup('linkFormatoA');
                        this.setup('linkFormatoD');
                        this.setup('linkFormatoE');
                        this.setup('anexos');
                    }

                    if (this.role.includes('ROLE_COORDINADOR')) {
                        this.setup('linkFormatoA');
                        this.setup('linkFormatoD');
                        this.setup('linkFormatoE');
                        this.setup('anexos');
                        this.setup('linkOficioDirigidoEvaluadores');
                    }
                    this.isLoading = false;
                    resolve();
                },
            });
        });
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

    async formatFileString(file: any, fileControlName: string): Promise<any> {
        try {
            if (fileControlName === 'anexos') {
                const files = await Promise.all(
                    file.map(async (anexo: any) => {
                        const base64 = await this.convertFileToBase64(anexo);
                        return `${base64}`;
                    })
                );
                return files;
            } else {
                const base64 = await this.convertFileToBase64(file);
                return `${base64}`;
            }
        } catch (error) {
            console.error('Error al convertir el archivo a base64:', error);
            throw error;
        }
    }

    convertFileToBase64(file: File | Blob): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (!(file instanceof File || file instanceof Blob)) {
                reject(new Error('El parámetro no es de tipo File o Blob'));
                return;
            }
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
        const maxFileSize = 5000000; // 5 MB
        if (selectedFiles && selectedFiles.length > 0) {
            const selectedFile = selectedFiles[0];
            if (selectedFile.size > maxFileSize) {
                this.messageService.add(
                    errorMessage(Aviso.ARCHIVO_DEMASIADO_GRANDE)
                );
                return null;
            }
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

    getFileAndSetValue(fieldName: string) {
        const handleError = () =>
            this.messageService.add(
                warnMessage('Modifica la informacion para ver los cambios.')
            );

        if (fieldName === 'anexos') {
            for (const anexo of this.solicitudForm.get(fieldName).value) {
                this.solicitudService.getFile(anexo.linkAnexo).subscribe({
                    next: (response: string) =>
                        this.downloadFile(response, anexo.linkAnexo, fieldName),
                    error: handleError,
                });
            }
        } else {
            const rutaArchivo = this.solicitudForm.get(fieldName).value;
            this.solicitudService.getFile(rutaArchivo).subscribe({
                next: (response: string) =>
                    this.downloadFile(response, rutaArchivo, fieldName),
                error: handleError,
            });
        }
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
        this.router.navigate([
            'examen-de-valoracion/solicitud/documentoFormatoA',
        ]);
    }

    limpiarEvaluadorExterno() {
        this.evaluadorExterno.setValue(null);
        this.evaluadorExternoSeleccionado = null;
    }

    limpiarEvaluadorInterno() {
        this.evaluadorInterno.setValue(null);
        this.evaluadorInternoSeleccionado = null;
    }

    redirectToRespuesta() {
        this.router.navigate(['examen-de-valoracion/respuesta']);
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

    mapEvaluadorInternoLabel(docente: any) {
        return {
            id: docente.id,
            nombres: docente.nombres ?? docente.nombre + ' ' + docente.apellido,
            correo: docente.correoElectronico ?? docente.correo,
            universidad: docente.universidad,
        };
    }

    mapEvaluadorExternoLabel(experto: any) {
        return {
            id: experto.id,
            nombres: experto.nombres ?? experto.nombre + ' ' + experto.apellido,
            correo: experto.correoElectronico ?? experto.correo,
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
