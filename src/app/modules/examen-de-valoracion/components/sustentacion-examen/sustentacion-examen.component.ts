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
import { Subscription, forkJoin, lastValueFrom, of, timer } from 'rxjs';
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
import { DocenteService } from 'src/app/shared/services/docente.service';
import { ExpertoService } from 'src/app/shared/services/experto.service';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { FileUpload } from 'primeng/fileupload';
import { Estudiante } from '../../../gestion-estudiantes/models/estudiante';
import { AuthService } from '../../../../shared/services/auth.service';
import { SolicitudService } from '../../services/solicitud.service';
import { SustentacionService } from '../../services/sustentacion.service';
import { TrabajoDeGradoService } from '../../services/trabajoDeGrado.service';
import { Experto } from '../../models/experto';
import { Sustentacion } from '../../models/sustentacion';

@Component({
    selector: 'app-sustentacion-examen',
    templateUrl: './sustentacion-examen.component.html',
    styleUrls: ['./sustentacion-examen.component.scss'],
})
export class SustentacionExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
    sustentacionForm: FormGroup;

    private trabajoSeleccionadoSubscription: Subscription;

    @ViewChild('FormatoF') FormatoF!: FileUpload;
    @ViewChild('FormatoG') FormatoG!: FileUpload;
    @ViewChild('EstudioHVA') EstudioHVA!: FileUpload;
    @ViewChild('FormatoH') FormatoH!: FileUpload;
    @ViewChild('FormatoI') FormatoI!: FileUpload;
    @ViewChild('ActaSustentacionP') ActaSustentacionP!: FileUpload;
    @ViewChild('EstudioHVAGrado') EstudioHVAGrado!: FileUpload;

    FileFormatoF: File | null = null;
    FileFormatoG: File | null = null;
    FileEstudioHVA: File | null = null;
    FileFormatoH: File | null = null;
    FileFormatoI: File | null = null;
    FileActaSustentacionP: File | null = null;
    FileEstudioHVAGrado: File | null = null;

    editMode: boolean = false;
    errorMessageShown: boolean = false;
    displayModal: boolean = false;
    isPdfLoaded: boolean = false;
    isDocenteCreated: boolean = false;
    isCoordinadorFase1Created: boolean = false;
    isEstudianteCreated: boolean = false;
    isCoordinadorFase2Created: boolean = false;
    isCoordinadorFase3Created: boolean = false;
    isCoordinadorFase4Created: boolean = false;
    isLoading: boolean = false;

    pdfUrls: { name: string; url: string }[] = [];
    role: string[];
    estado: string;

    trabajoDeGradoId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;
    currentPdfIndex: number = 0;

    estudianteSeleccionado: Estudiante = {};
    juradoExternoSeleccionado: Experto;
    juradoInternoSeleccionado: Docente;

    estados: string[] = ['Aceptado', 'Rechazado'];
    respuestas: string[] = ['Aprobado', 'No Aprobado'];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private solicitudService: SolicitudService,
        private trabajoDeGradoService: TrabajoDeGradoService,
        private sustentacionService: SustentacionService,
        private dialogService: DialogService,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private authService: AuthService,
        private docenteService: DocenteService,
        private expertoService: ExpertoService
    ) {}

    get juradoInterno(): FormControl {
        return this.sustentacionForm.get('idJuradoInterno') as FormControl;
    }

    get juradoExterno(): FormControl {
        return this.sustentacionForm.get('idJuradoExterno') as FormControl;
    }

    ngOnInit() {
        this.role = this.authService.getRole();
        this.setBreadcrumb();
        this.initForm();
        this.subscribeToObservers();
        if (this.router.url.includes('editar')) {
            this.loadEditMode();
        }
        this.checkEstados();
    }

    async loadEditMode() {
        this.editMode = true;
        await this.loadSustentacion();
    }

    initForm(): void {
        this.sustentacionForm = this.fb.group({
            idSustentacionTrabajoInvestigacion: [null, Validators.required],
            linkFormatoF: ['', Validators.required],
            urlDocumentacion: ['', Validators.required],
            asuntoCoordinador: [null],
            mensajeCoordinador: [null],
            conceptoCoordinador: [null, Validators.required],
            asuntoComite: [null],
            mensajeComite: [null],
            conceptoComite: [null, Validators.required],
            linkFormatoG: ['', Validators.required],
            linkEstudioHojaVidaAcademica: ['', Validators.required],
            numeroActa: ['', Validators.required],
            fechaActa: ['', Validators.required],
            asuntoConsejo: [null],
            mensajeConsejo: [null],
            juradosAceptados: [''],
            idJuradoInterno: ['', Validators.required],
            idJuradoExterno: ['', Validators.required],
            numeroActaConsejo: ['', Validators.required],
            fechaActaConsejo: ['', Validators.required],
            linkFormatoH: ['', Validators.required],
            linkFormatoI: ['', Validators.required],
            linkActaSustentacionPublica: ['', Validators.required],
            respuestaSustentacion: [null, Validators.required],
            linkEstudioHojaVidaAcademicaGrado: ['', Validators.required],
            numeroActaFinal: ['', Validators.required],
            fechaActaFinal: ['', Validators.required],
        });

        this.formReady.emit(this.sustentacionForm);

        this.sustentacionForm
            .get('conceptoCoordinador')
            .valueChanges.subscribe((value) => {
                if (value == 'Aceptado') {
                    this.sustentacionForm
                        .get('asuntoCoordinador')
                        .setValue(
                            'Solicitud de revision sustentacion de valoracion'
                        );

                    this.sustentacionForm
                        .get('mensajeCoordinador')
                        .setValue(
                            'Solicito comedidamente revisar el sustentacion de valoracion del estudiante para aprobacion.'
                        );
                }
                if (value == 'Rechazado') {
                    this.sustentacionForm
                        .get('asuntoCoordinador')
                        .setValue(
                            'Correcion solicitud sustentacion de valoracion'
                        );
                    this.sustentacionForm
                        .get('mensajeCoordinador')
                        .setValue(
                            'Solicito comedidamente revisar el anteproyecto en el apartado de Introduccion.'
                        );
                }
            });

        this.sustentacionForm
            .get('conceptoComite')
            .valueChanges.subscribe((value) => {
                if (value == 'Aceptado') {
                    this.sustentacionForm
                        .get('asuntoComite')
                        .setValue(
                            'Solicitud de revision sustentacion de valoracion'
                        );

                    this.sustentacionForm
                        .get('mensajeComite')
                        .setValue(
                            'Solicito comedidamente revisar el sustentacion de valoracion del estudiante para aprobacion.'
                        );
                }
                if (value == 'Rechazado') {
                    this.sustentacionForm
                        .get('asuntoComite')
                        .setValue(
                            'Correcion solicitud sustentacion de valoracion'
                        );
                    this.sustentacionForm
                        .get('mensajeComite')
                        .setValue(
                            'Solicito comedidamente revisar el anteproyecto en el apartado de Introduccion.'
                        );
                }
            });

        this.sustentacionForm
            .get('juradosAceptados')
            .valueChanges.subscribe((value) => {
                if (value == 'aceptado') {
                    this.sustentacionForm
                        .get('asuntoConsejo')
                        .setValue(
                            'Solicitud de revision sustentacion de valoracion'
                        );

                    this.sustentacionForm
                        .get('mensajeConsejo')
                        .setValue(
                            'Solicito comedidamente revisar el sustentacion de valoracion del estudiante para aprobacion.'
                        );
                }
                if (value == 'Rechazado') {
                    this.sustentacionForm
                        .get('asuntoConsejo')
                        .setValue(
                            'Correcion solicitud sustentacion de valoracion'
                        );
                    this.sustentacionForm
                        .get('mensajeConsejo')
                        .setValue(
                            'Solicito comedidamente revisar el anteproyecto en el apartado de Introduccion.'
                        );
                }
            });
    }

    updateFormFields(role: string[]): void {
        const formControls = this.sustentacionForm.controls;

        for (const control in formControls) {
            formControls[control].disable();
        }

        if (role.includes('ROLE_DOCENTE')) {
            formControls['linkFormatoF'].enable();
            formControls['urlDocumentacion'].enable();
            formControls['idJuradoInterno'].enable();
            formControls['idJuradoExterno'].enable();
        }

        if (role.includes('ROLE_ESTUDIANTE')) {
            if (
                this.isCoordinadorFase3Created &&
                !this.isCoordinadorFase4Created
            ) {
                formControls['linkFormatoH'].enable();
                formControls['linkFormatoI'].enable();
            }
        }

        if (role.includes('ROLE_COORDINADOR')) {
            if (this.isDocenteCreated && !this.isCoordinadorFase1Created) {
                formControls['asuntoCoordinador'].enable();
                formControls['mensajeCoordinador'].enable();
                formControls['conceptoCoordinador'].enable();
            }

            if (
                this.isCoordinadorFase1Created &&
                !this.isCoordinadorFase2Created
            ) {
                formControls['asuntoComite'].enable();
                formControls['mensajeComite'].enable();
                formControls['conceptoComite'].enable();
                formControls['linkFormatoG'].enable();
                formControls['linkEstudioHojaVidaAcademica'].enable();
                formControls['numeroActa'].enable();
                formControls['fechaActa'].enable();
            }

            if (
                this.isCoordinadorFase2Created &&
                !this.isCoordinadorFase3Created
            ) {
                formControls['juradosAceptados'].enable();
                formControls['asuntoConsejo'].enable();
                formControls['mensajeConsejo'].enable();
                formControls['idJuradoInterno'].enable();
                formControls['idJuradoExterno'].enable();
                formControls['numeroActaConsejo'].enable();
                formControls['fechaActaConsejo'].enable();
            }

            if (this.isEstudianteCreated && !this.isCoordinadorFase4Created) {
                formControls['linkActaSustentacionPublica'].enable();
                formControls['respuestaSustentacion'].enable();
                formControls['linkEstudioHojaVidaAcademicaGrado'].enable();
                formControls['numeroActaFinal'].enable();
                formControls['fechaActaFinal'].enable();
            }
        }
    }

    subscribeToObservers() {
        this.trabajoDeGradoService.estudianteSeleccionado$.subscribe({
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
            this.trabajoDeGradoService.trabajoSeleccionadoSubject$.subscribe({
                next: (response) => {
                    if (response) {
                        this.trabajoDeGradoId = response.id;
                        this.estado = response.estado;
                        if (
                            this.estado ==
                                EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_DOCENTE_SUSTENTACION &&
                            this.role.includes('ROLE_COORDINADOR')
                        ) {
                            this.router.navigate(['examen-de-valoracion']);
                        }
                    } else {
                        this.router.navigate(['examen-de-valoracion']);
                    }
                },
                error: (e) => this.handlerResponseException(e),
            });
        this.trabajoDeGradoService.resolucionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.resolucionId = response.idGeneracionResolucion;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.trabajoDeGradoService.sustentacionSeleccionadaSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.sustentacionId =
                        response.idSustentacionTrabajoInvestigacion;
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.trabajoDeGradoService.evaluadorExternoSeleccionadoSubject$.subscribe(
            {
                next: (response) => {
                    if (response) {
                        this.juradoExternoSeleccionado = response;
                        this.juradoExterno?.setValue(response.id);
                    }
                },
                error: (e) => this.handlerResponseException(e),
            }
        );
        this.trabajoDeGradoService.evaluadorInternoSeleccionadoSubject$.subscribe(
            {
                next: (response) => {
                    if (response) {
                        this.juradoInternoSeleccionado = response;
                        this.juradoInterno?.setValue(response.id);
                    }
                },
                error: (e) => this.handlerResponseException(e),
            }
        );
    }

    setup(fieldName: string) {
        if (Object.keys(this.estudianteSeleccionado).length > 0) {
            this.solicitudService
                .getFile(this.sustentacionForm.get(fieldName).value)
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
                                case 'linkFormatoF':
                                    this.FileFormatoF = file;
                                    break;
                                case 'linkFormatoG':
                                    this.FileFormatoG = file;
                                    break;
                                case 'linkEstudioHojaVidaAcademica':
                                    this.FileEstudioHVA = file;
                                    break;
                                case 'linkFormatoH':
                                    this.FileFormatoH = file;
                                    break;
                                case 'linkFormatoI':
                                    this.FileFormatoI = file;
                                    break;
                                case 'linkActaSustentacionPublica':
                                    this.FileActaSustentacionP = file;
                                    break;
                                case 'linkEstudioHojaVidaAcademicaGrado':
                                    this.FileEstudioHVAGrado = file;
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

    ngOnDestroy() {
        if (this.trabajoSeleccionadoSubscription) {
            this.trabajoSeleccionadoSubscription.unsubscribe();
        }
    }

    checkEstados() {
        switch (this.estado) {
            // case EstadoProceso.DEVUELTO_SUSTENTACION_PARA_CORREGIR_AL_DOCENTE:
            //     addMessage('warn', 'Información', Aviso.CORREGIR_CAMPOS_OBLIGATORIOS);
            //     this.isDocenteCreated = false;
            //     this.isCoordinadorFase1Created = false;
            //     this.isEstudianteCreated = false;
            //     this.isCoordinadorFase2Created = false;
            //     this.isCoordinadorFase3Created = false;
            //     break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_DOCENTE_SUSTENTACION:
                this.messageService.add({
                    severity: 'info',
                    summary: 'Informacion',
                    detail: EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_DOCENTE_SUSTENTACION,
                    life: 2000,
                });
                this.isDocenteCreated = false;
                this.isCoordinadorFase1Created = false;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase4Created = false;
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE1_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = false;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase4Created = false;
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE2_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase4Created = false;
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE3_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase4Created = false;
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_ESTUDIANTE_SUSTENTACION:
                this.messageService.add({
                    severity: 'info',
                    summary: 'Informacion',
                    detail: EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_ESTUDIANTE_SUSTENTACION,
                    life: 2000,
                });
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase4Created = false;
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE4_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase4Created = false;
                break;
            case EstadoProceso.SUSTENTACION_APROBADA:
                this.messageService.add({
                    severity: 'success',
                    summary: 'Informacion',
                    detail: EstadoProceso.SUSTENTACION_APROBADA,
                    life: 2000,
                });
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                this.isCoordinadorFase4Created = true;
                break;

            case EstadoProceso.SUSTENTACION_NO_APROBADA:
                this.messageService.add({
                    severity: 'error',
                    summary: 'Informacion',
                    detail: EstadoProceso.SUSTENTACION_NO_APROBADA,
                    life: 2000,
                });
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                this.isCoordinadorFase4Created = true;
                break;

            case EstadoProceso.SUSTENTACION_APLAZADA:
                this.messageService.add({
                    severity: 'error',
                    summary: 'Informacion',
                    detail: EstadoProceso.SUSTENTACION_APLAZADA,
                    life: 2000,
                });
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                this.isCoordinadorFase4Created = true;
                break;

            default:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                this.isCoordinadorFase4Created = true;
                break;
        }

        this.updateFormFields(this.role);
    }

    //#region PDF VIEWER
    async loadPdfFiles() {
        const filesToConvert = [
            this.FileActaSustentacionP,
            this.FileEstudioHVA,
            this.FileEstudioHVAGrado,
            this.FileFormatoF,
            this.FileFormatoG,
            this.FileFormatoH,
            this.FileFormatoI,
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

    setValuesForm(sustentacion: Sustentacion) {
        this.sustentacionForm.patchValue({
            ...sustentacion,
        });
    }

    async loadSustentacion(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const docenteObs =
                this.role.includes('ROLE_DOCENTE') ||
                this.role.includes('ROLE_COORDINADOR')
                    ? this.sustentacionService.getSustentacionDocente(
                          this.trabajoDeGradoId
                      )
                    : of(null);
            const coordinadorFase1Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.sustentacionService.getSustentacionCoordinadorFase1(
                      this.trabajoDeGradoId
                  )
                : of(null);
            const coordinadorFase2Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.sustentacionService.getSustentacionCoordinadorFase2(
                      this.trabajoDeGradoId
                  )
                : of(null);
            const coordinadorFase3Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.sustentacionService.getSustentacionCoordinadorFase3(
                      this.trabajoDeGradoId
                  )
                : of(null);
            const estudianteObs =
                this.role.includes('ROLE_COORDINADOR') ||
                this.role.includes('ROLE_ESTUDIANTE')
                    ? this.sustentacionService.getSustentacionEstudiante(
                          this.trabajoDeGradoId
                      )
                    : of(null);
            const coordinadorFase4Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.sustentacionService.getSustentacionCoordinadorFase4(
                      this.trabajoDeGradoId
                  )
                : of(null);

            forkJoin({
                docente: docenteObs,
                coordinadorFase1: coordinadorFase1Obs,
                coordinadorFase2: coordinadorFase2Obs,
                estudiante: estudianteObs,
                coordinadorFase3: coordinadorFase3Obs,
                coordinadorFase4: coordinadorFase4Obs,
            }).subscribe({
                next: (responses) => {
                    if (responses.docente) {
                        const data = responses.docente;
                        this.setValuesForm(data);
                    }

                    if (responses.coordinadorFase1) {
                        const data = responses.coordinadorFase1;
                        data.conceptoCoordinador
                            ? this.sustentacionForm
                                  .get('conceptoCoordinador')
                                  .setValue('Aceptado')
                            : this.sustentacionForm
                                  .get('conceptoCoordinador')
                                  .setValue('Rechazado');
                    }

                    if (responses.coordinadorFase2) {
                        const data = responses.coordinadorFase2;
                        this.setValuesForm(data);

                        const lastIdx: number =
                            data.actaFechaRespuestaComite.length - 1;
                        const lastActa = data.actaFechaRespuestaComite[lastIdx];

                        const actaDate = lastActa?.fechaActa;
                        const actaNumber = lastActa?.numeroActa;
                        const actaConceptoComite = lastActa?.conceptoComite;

                        this.sustentacionForm
                            .get('fechaActa')
                            .setValue(actaDate ? new Date(actaDate) : null);

                        this.sustentacionForm
                            .get('numeroActa')
                            .setValue(actaNumber ? actaNumber : null);

                        this.sustentacionForm
                            .get('conceptoComite')
                            .setValue(
                                actaConceptoComite ? 'Aceptado' : 'Rechazado'
                            );
                    }

                    if (responses.coordinadorFase3) {
                        const data = responses.coordinadorFase3;
                        this.setValuesForm(data);

                        this.expertoService
                            .obtenerExperto(
                                this.sustentacionForm.get('idJuradoExterno')
                                    .value
                            )
                            .subscribe({
                                next: (response) => {
                                    this.juradoExternoSeleccionado =
                                        this.mapJuradoExternoLabel(response);
                                    this.juradoExterno.setValue(response.id);
                                },
                            });

                        this.docenteService
                            .obtenerDocente(
                                this.sustentacionForm.get('idJuradoInterno')
                                    .value
                            )
                            .subscribe({
                                next: (response) => {
                                    this.juradoInternoSeleccionado =
                                        this.mapJuradoInternoLabel(response);
                                    this.juradoInterno.setValue(response.id);
                                },
                            });

                        this.sustentacionForm
                            .get('juradosAceptados')
                            .setValue(
                                data?.juradosAceptados == 1
                                    ? 'aceptado'
                                    : 'rechazado'
                            );

                        this.sustentacionForm
                            .get('fechaActaConsejo')
                            .setValue(
                                data?.fechaActaConsejo
                                    ? new Date(data.fechaActaConsejo)
                                    : null
                            );
                    }

                    if (responses.estudiante) {
                        const data = responses.estudiante;
                        this.setValuesForm(data);
                    }

                    if (responses.coordinadorFase4) {
                        const data = responses.coordinadorFase4;
                        this.setValuesForm(data);

                        this.sustentacionForm
                            .get('fechaActaFinal')
                            .setValue(
                                data?.fechaActaFinal
                                    ? new Date(data.fechaActaFinal)
                                    : null
                            );
                    }
                },
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    if (this.role.includes('ROLE_DOCENTE')) {
                        this.setup('linkFormatoF');
                    }

                    if (this.role.includes('ROLE_ESTUDIANTE')) {
                        this.setup('linkFormatoH');
                        this.setup('linkFormatoI');
                    }

                    if (this.role.includes('ROLE_COORDINADOR')) {
                        this.setup('linkFormatoF');
                        this.setup('linkFormatoG');
                        this.setup('linkEstudioHojaVidaAcademica');
                        this.setup('linkFormatoH');
                        this.setup('linkFormatoI');
                        this.setup('linkActaSustentacionPublica');
                        this.setup('linkEstudioHojaVidaAcademicaGrado');
                    }
                    this.isLoading = false;
                    resolve();
                },
            });
        });
    }

    async updateSustentacion() {
        this.isLoading = true;
        try {
            if (
                this.role.includes('ROLE_COORDINADOR') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == false
            ) {
                const base64FormatoF = await this.formatFileString(
                    this.FileFormatoF
                );

                const sustentacionData =
                    this.sustentacionForm.get('conceptoCoordinador').value ==
                    'Aceptado'
                        ? {
                              conceptoCoordinador: true,
                              envioEmailDto: {
                                  asunto: this.sustentacionForm.get(
                                      'asuntoCoordinador'
                                  ).value,
                                  mensaje:
                                      this.sustentacionForm.get(
                                          'mensajeCoordinador'
                                      ).value,
                              },
                              obtenerDocumentosParaEnvioDto: { base64FormatoF },
                          }
                        : {
                              conceptoCoordinador: false,
                              envioEmailDto: {
                                  asunto: this.sustentacionForm.get(
                                      'asuntoCoordinador'
                                  ).value,
                                  mensaje:
                                      this.sustentacionForm.get(
                                          'mensajeCoordinador'
                                      ).value,
                              },
                          };

                await lastValueFrom(
                    this.sustentacionService.createSustentacionCoordinadorFase1(
                        sustentacionData,
                        this.trabajoDeGradoId
                    )
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == false
            ) {
                const {
                    fechaActa,
                    numeroActa,
                    linkEstudioHojaVidaAcademica,
                    linkFormatoG,
                } = this.sustentacionForm.value;

                const sustentacionData =
                    this.sustentacionForm.get('conceptoComite').value ==
                    'Aceptado'
                        ? {
                              actaFechaRespuestaComite: [
                                  {
                                      fechaActa,
                                      numeroActa,
                                      conceptoComite: true,
                                  },
                              ],
                              envioEmailDto: {
                                  asunto: this.sustentacionForm.get(
                                      'asuntoComite'
                                  ).value,
                                  mensaje:
                                      this.sustentacionForm.get('mensajeComite')
                                          .value,
                              },
                              linkEstudioHojaVidaAcademica,
                              linkFormatoG,
                          }
                        : {
                              actaFechaRespuestaComite: [
                                  {
                                      fechaActa,
                                      numeroActa,
                                      conceptoComite: false,
                                  },
                              ],
                              envioEmailDto: {
                                  asunto: this.sustentacionForm.get(
                                      'asuntoComite'
                                  ).value,
                                  mensaje:
                                      this.sustentacionForm.get('mensajeComite')
                                          .value,
                              },
                          };

                await lastValueFrom(
                    this.sustentacionService.createSustentacionCoordinadorFase2(
                        sustentacionData,
                        this.trabajoDeGradoId
                    )
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isCoordinadorFase3Created == false &&
                this.isEstudianteCreated == false
            ) {
                const {
                    idJuradoInterno,
                    idJuradoExterno,
                    numeroActaConsejo,
                    fechaActaConsejo,
                } = this.sustentacionForm.value;

                const sustentacionData =
                    this.sustentacionForm.get('juradosAceptados').value ==
                    'aceptado'
                        ? {
                              idJuradoInterno,
                              idJuradoExterno,
                              juradosAceptados: true,
                              numeroActaConsejo,
                              fechaActaConsejo,
                              envioEmailDto: {
                                  asunto: this.sustentacionForm.get(
                                      'asuntoConsejo'
                                  ).value,
                                  mensaje:
                                      this.sustentacionForm.get(
                                          'mensajeConsejo'
                                      ).value,
                              },
                          }
                        : {
                              juradosAceptados: false,
                              envioEmailDto: {
                                  asunto: this.sustentacionForm.get(
                                      'asuntoConsejo'
                                  ).value,
                                  mensaje:
                                      this.sustentacionForm.get(
                                          'mensajeConsejo'
                                      ).value,
                              },
                          };

                await lastValueFrom(
                    this.sustentacionService.createSustentacionCoordinadorFase3(
                        sustentacionData,
                        this.trabajoDeGradoId
                    )
                );
            } else if (
                this.role.includes('ROLE_ESTUDIANTE') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isCoordinadorFase3Created == true &&
                this.isEstudianteCreated == false
            ) {
                await lastValueFrom(
                    this.sustentacionService.createSustentacionEstudiante(
                        this.sustentacionForm.value,
                        this.trabajoDeGradoId
                    )
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isCoordinadorFase3Created == true &&
                this.isEstudianteCreated == true &&
                this.isCoordinadorFase4Created == false
            ) {
                await lastValueFrom(
                    this.sustentacionService.createSustentacionCoordinadorFase4(
                        this.sustentacionForm.value,
                        this.trabajoDeGradoId
                    )
                );
            } else if (
                this.role.includes('ROLE_ESTUDIANTE') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isCoordinadorFase3Created == true &&
                this.isEstudianteCreated == true
            ) {
                this.isLoading = false;
                return this.messageService.add(
                    errorMessage('No puedes modificar los datos.')
                );
            } else if (
                (this.role.includes('ROLE_COORDINADOR') ||
                    this.role.includes('ROLE_DOCENTE')) &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isCoordinadorFase3Created == true &&
                this.isEstudianteCreated == true &&
                this.isCoordinadorFase4Created == true
            ) {
                this.isLoading = false;
                return this.messageService.add(
                    errorMessage('No puedes modificar los datos.')
                );
            }

            this.isLoading = false;
            this.messageService.add(infoMessage(Mensaje.ACTUALIZACION_EXITOSA));
            this.router.navigate(['examen-de-valoracion']);
        } catch (error) {
            this.isLoading = false;
            this.messageService.add(
                errorMessage('Error al actualizar los datos en el backend')
            );
        }
    }

    createSustentacion(): void {
        this.isLoading = true;
        if (
            this.role.includes('ROLE_DOCENTE') == true &&
            this.isDocenteCreated == false
        )
            this.sustentacionService
                .createSustentacionDocente(
                    this.sustentacionForm.value,
                    this.trabajoDeGradoId
                )
                .subscribe({
                    next: (response) => {
                        if (response) {
                            this.trabajoDeGradoService.setSustentacionSeleccionada(
                                response
                            );
                            this.messageService.add(
                                infoMessage(Mensaje.GUARDADO_EXITOSO)
                            );
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.router.navigate([`examen-de-valoracion`]);
                            });
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });

        if (
            (this.role.includes('ROLE_ESTUDIANTE') == true ||
                this.role.includes('ROLE_COORDINADOR') == true) &&
            this.isDocenteCreated == false
        ) {
            this.isLoading = false;
            this.messageService.add(
                warnMessage(Aviso.CAMPOS_DOCENTE_PENDIENTE)
            );
        }
    }

    createOrUpdateSustentacion() {
        if (this.sustentacionForm.invalid) {
            this.messageService.clear();
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }

        this.router.url.includes('editar')
            ? this.updateSustentacion()
            : this.createSustentacion();
    }

    onFileSelectFirst(event: any) {
        this.FileFormatoF = this.uploadFileAndSetValue('linkFormatoF', event);
    }

    onFileSelectSecond(event: any) {
        this.FileFormatoG = this.uploadFileAndSetValue('linkFormatoG', event);
    }

    onFileSelectThird(event: any) {
        this.FileEstudioHVA = this.uploadFileAndSetValue(
            'linkEstudioHojaVidaAcademica',
            event
        );
    }

    onFileSelectFourth(event: any) {
        this.FileFormatoH = this.uploadFileAndSetValue('linkFormatoH', event);
    }

    onFileSelectFifth(event: any) {
        this.FileFormatoI = this.uploadFileAndSetValue('linkFormatoI', event);
    }

    onFileSelectSixth(event: any) {
        this.FileActaSustentacionP = this.uploadFileAndSetValue(
            'linkActaSustentacionPublica',
            event
        );
    }

    onFileSelectSeventh(event: any) {
        this.FileEstudioHVAGrado = this.uploadFileAndSetValue(
            'linkEstudioHojaVidaAcademicaGrado',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'linkFormatoF') {
            this.FileFormatoF = null;
            this.FormatoF.clear();
            this.sustentacionForm.get('linkFormatoF').reset();
        }

        if (field == 'linkFormatoG') {
            this.FileFormatoG = null;
            this.FormatoG.clear();
            this.sustentacionForm.get('linkFormatoG').reset();
        }

        if (field == 'linkEstudioHojaVidaAcademica') {
            this.FileEstudioHVA = null;
            this.EstudioHVA.clear();
            this.sustentacionForm.get('linkEstudioHojaVidaAcademica').reset();
        }

        if (field == 'linkFormatoH') {
            this.FileFormatoH = null;
            this.FormatoH.clear();
            this.sustentacionForm.get('linkFormatoH').reset();
        }

        if (field == 'linkFormatoI') {
            this.FileFormatoI = null;
            this.FormatoI.clear();
            this.sustentacionForm.get('linkFormatoI').reset();
        }

        if (field == 'linkActaSustentacionPublica') {
            this.FileActaSustentacionP = null;
            this.ActaSustentacionP.clear();
            this.sustentacionForm.get('linkActaSustentacionPublica').reset();
        }

        if (field == 'linkEstudioHojaVidaAcademicaGrado') {
            this.FileEstudioHVAGrado = null;
            this.EstudioHVAGrado.clear();
            this.sustentacionForm
                .get('linkEstudioHojaVidaAcademicaGrado')
                .reset();
        }
    }

    async formatFileString(file: any): Promise<any> {
        try {
            const base64 = await this.convertFileToBase64(file);
            return `${base64}`;
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
                    this.sustentacionForm
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
            .getFile(this.sustentacionForm.get(fieldName).value)
            .subscribe({
                next: (response: string) => {
                    const rutaArchivo =
                        this.sustentacionForm.get(fieldName).value;
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

    //#region Director and Coodirector
    showBuscadorJuradoInterno() {
        return this.dialogService.open(BuscadorDocentesComponent, {
            header: 'Seleccionar docente',
            width: '60%',
        });
    }

    showBuscadorJuradoExterno() {
        return this.dialogService.open(BuscadorExpertosComponent, {
            header: 'Seleccionar experto',
            width: '60%',
        });
    }

    mapJuradoInternoLabel(docente: any) {
        const ultimaUniversidad =
            docente?.titulos?.length > 0
                ? docente.titulos[docente.titulos.length - 1].universidad
                : null;

        return {
            id: docente.id,
            nombre: docente.nombre,
            apellido: docente.apellido,
            correo: docente.correoElectronico ?? docente.correo,
            universidad: docente.universidad ?? ultimaUniversidad,
        };
    }

    mapJuradoExternoLabel(experto: any) {
        return {
            id: experto.id,
            nombre: experto.nombre,
            apellido: experto.apellido,
            correo: experto.correoElectronico ?? experto.correo,
            universidad: experto.universidad,
        };
    }

    onSeleccionarJuradoInterno() {
        const ref = this.showBuscadorJuradoInterno();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const director = this.mapJuradoInternoLabel(response);
                    this.juradoInternoSeleccionado = director;
                    this.juradoInterno.setValue(director.id);
                }
            },
        });
    }

    onSeleccionarJuradoExterno() {
        const ref = this.showBuscadorJuradoExterno();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    const coodirector = this.mapJuradoExternoLabel(response);
                    this.juradoExternoSeleccionado = coodirector;
                    this.juradoExterno.setValue(coodirector.id);
                }
            },
        });
    }

    limpiarJuradoExterno() {
        this.juradoExterno.setValue(null);
        this.juradoExternoSeleccionado = null;
    }

    limpiarJuradoInterno() {
        this.juradoInterno.setValue(null);
        this.juradoInternoSeleccionado = null;
    }
    //#endregion

    redirectToSolicitud(trabajoDeGradoId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${trabajoDeGradoId}`,
        ]);
    }

    redirectToRespuesta() {
        this.router.navigate(['examen-de-valoracion/respuesta']);
    }

    redirectToResolucion(resolucionId: number) {
        resolucionId
            ? this.router.navigate([
                  `examen-de-valoracion/resolucion/editar/${this.trabajoDeGradoId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/resolucion']);
    }

    redirectToBandeja() {
        this.router.navigate(['examen-de-valoracion']);
    }

    handlerResponseException(response: any) {
        if (response.status != 500) return;
        const mapException = mapResponseException(response.error);
        mapException.forEach((value, _) => {
            this.messageService.add(errorMessage(value));
        });
    }

    isActiveIndex(): Boolean {
        if (this.router.url.includes('sustentacion')) {
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
            { label: 'Sustentacion' },
        ]);
    }
}
