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
import { Subscription, forkJoin, lastValueFrom, of, timer } from 'rxjs';
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
import { Aviso, EstadoProceso, Mensaje } from 'src/app/core/enums/enums';
import { BuscadorExpertosComponent } from 'src/app/shared/components/buscador-expertos/buscador-expertos.component';
import { BuscadorDocentesComponent } from 'src/app/shared/components/buscador-docentes/buscador-docentes.component';
import { DialogService } from 'primeng/dynamicdialog';
import { AuthService } from '../../../../shared/services/auth.service';
import { ExpertoService } from 'src/app/shared/services/experto.service';
import { DocenteService } from 'src/app/shared/services/docente.service';
import { TrabajoDeGradoService } from '../../services/trabajoDeGrado.service';

@Component({
    selector: 'app-resolucion-examen',
    templateUrl: './resolucion-examen.component.html',
    styleUrls: ['./resolucion-examen.component.scss'],
})
export class ResolucionExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();

    resolucionForm: FormGroup;

    private trabajoSeleccionadoSubscription: Subscription;

    @ViewChild('AnteproyectoFinal') AnteproyectoFinal!: FileUpload;
    @ViewChild('SolicitudComite') SolicitudComite!: FileUpload;
    @ViewChild('SolicitudConsejo') SolicitudConsejo!: FileUpload;

    FileAnteproyectoFinal: File | null;
    FileSolicitudComite: File | null;
    FileSolicitudConsejo: File | null;

    displayModal: boolean = false;
    errorMessageShown: boolean = false;
    editMode: boolean = false;
    isPdfLoaded: boolean = false;
    isLoading: boolean;
    isDocenteCreated: boolean = false;
    isCoordinadorFase1Created: boolean = false;
    isCoordinadorFase2Created: boolean = false;
    isCoordinadorFase3Created: boolean = false;
    isResolucionValid: boolean = false;

    role: string[];
    pdfUrls: { name: string; url: string }[] = [];
    estados: string[] = ['Aceptado', 'Rechazado'];

    trabajoDeGradoId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;
    currentPdfIndex: number = 0;

    estado: string;
    tituloSeleccionado: string;
    estudianteSeleccionado: Estudiante = {};
    codirectorSeleccionado: Experto;
    directorSeleccionado: Docente;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private trabajoDeGradoService: TrabajoDeGradoService,
        private resolucionService: ResolucionService,
        private solicitudService: SolicitudService,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private authService: AuthService,
        private expertoService: ExpertoService,
        private docenteService: DocenteService
    ) {}

    get director(): FormControl {
        return this.resolucionForm.get('director') as FormControl;
    }

    get codirector(): FormControl {
        return this.resolucionForm.get('codirector') as FormControl;
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
        await this.loadResolucion();
    }

    initForm(): void {
        this.resolucionForm = this.fb.group({
            director: [null, Validators.required],
            codirector: [null, Validators.required],
            linkAnteproyectoFinal: [null, Validators.required],
            linkSolicitudComite: [null, Validators.required],
            asuntoCoordinador: [null],
            mensajeCoordinador: [null],
            asuntoComite: [null],
            mensajeComite: [null],
            conceptoDocumentosCoordinador: [null, Validators.required],
            conceptoComite: [null, Validators.required],
            numeroActa: [null, Validators.required],
            fechaActa: [null, Validators.required],
            linkSolicitudConsejoFacultad: [null, Validators.required],
            numeroActaConsejoFacultad: [null, Validators.required],
            fechaActaConsejoFacultad: [null, Validators.required],
        });

        this.formReady.emit(this.resolucionForm);

        this.resolucionForm
            .get('conceptoDocumentosCoordinador')
            .valueChanges.subscribe((value) => {
                if (value == 'Aceptado') {
                    this.resolucionForm
                        .get('asuntoCoordinador')
                        .setValue(
                            'Solicitud de revision resolucion de valoracion'
                        );

                    this.resolucionForm
                        .get('mensajeCoordinador')
                        .setValue(
                            'Solicito comedidamente revisar el resolucion de valoracion del estudiante para aprobacion.'
                        );
                }
                if (value == 'Rechazado') {
                    this.resolucionForm
                        .get('asuntoCoordinador')
                        .setValue(
                            'Correcion solicitud resolucion de valoracion'
                        );
                    this.resolucionForm
                        .get('mensajeCoordinador')
                        .setValue(
                            'Solicito comedidamente revisar el anteproyecto en el apartado de Introduccion.'
                        );
                }
            });

        this.resolucionForm
            .get('conceptoComite')
            .valueChanges.subscribe((value) => {
                if (value == 'Aceptado') {
                    this.resolucionForm
                        .get('asuntoComite')
                        .setValue('Envio evaluadores');
                    this.resolucionForm
                        .get('mensajeComite')
                        .setValue(
                            'Envio documentos para que por favor los revisen y den respuesta oportuna.'
                        );
                }
                if (value == 'Rechazado') {
                    this.resolucionForm
                        .get('asuntoComite')
                        .setValue('Envio correcion por parte del comite');
                    this.resolucionForm
                        .get('mensajeComite')
                        .setValue(
                            'Por favor corregir el apartado de metolodogia y dar respuesta oportuna a las correciones.'
                        );
                }
            });
    }

    updateFormFields(role: string[]): void {
        const formControls = this.resolucionForm.controls;

        for (const control in formControls) {
            formControls[control].disable();
        }

        if (role.includes('ROLE_DOCENTE')) {
            formControls['director'].enable();
            formControls['codirector'].enable();
            formControls['linkAnteproyectoFinal'].enable();
            formControls['linkSolicitudComite'].enable();
        }

        if (role.includes('ROLE_COORDINADOR')) {
            if (this.isDocenteCreated && !this.isCoordinadorFase1Created) {
                formControls['conceptoDocumentosCoordinador'].enable();
                formControls['asuntoCoordinador'].enable();
                formControls['mensajeCoordinador'].enable();
            }

            if (
                this.isCoordinadorFase1Created &&
                !this.isCoordinadorFase2Created
            ) {
                formControls['conceptoComite'].enable();
                formControls['asuntoComite'].enable();
                formControls['mensajeComite'].enable();
                formControls['numeroActa'].enable();
                formControls['fechaActa'].enable();
                formControls['linkSolicitudConsejoFacultad'].enable();
            }

            if (this.isCoordinadorFase2Created) {
                formControls['numeroActaConsejoFacultad'].enable();
                formControls['fechaActaConsejoFacultad'].enable();
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
        this.trabajoDeGradoService.tituloSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.tituloSeleccionado = response;
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
                                EstadoProceso.EXAMEN_DE_VALORACION_APROBADO_EVALUADOR_2 &&
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
        this.trabajoDeGradoService.resolucionValid$.subscribe({
            next: (response) => {
                if (response) {
                    this.isResolucionValid = response;
                } else {
                    if (this.trabajoDeGradoId) {
                        this.resolucionService
                            .getResolucionCoordinadorFase3(
                                this.trabajoDeGradoId
                            )
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
    }

    ngOnDestroy() {
        if (this.trabajoSeleccionadoSubscription) {
            this.trabajoSeleccionadoSubscription.unsubscribe();
        }
    }

    checkEstados() {
        switch (this.estado) {
            case EstadoProceso.EXAMEN_DE_VALORACION_APROBADO_EVALUADOR_2:
                this.messageService.add({
                    severity: 'info',
                    summary: 'Informacion',
                    detail: EstadoProceso.EXAMEN_DE_VALORACION_APROBADO_EVALUADOR_2,
                    life: 2000,
                });
                this.isDocenteCreated = false;
                this.isCoordinadorFase1Created = false;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                break;
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE1_GENERACION_RESOLUCION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = false;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                break;
            case EstadoProceso.DEVUELTO_GENERACION_DE_RESOLUCION_POR_COORDINADOR:
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: EstadoProceso.DEVUELTO_GENERACION_DE_RESOLUCION_POR_COORDINADOR,
                    life: 2000,
                });
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                break;
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE2_GENERACION_RESOLUCION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                break;
            case EstadoProceso.DEVUELTO_GENERACION_DE_RESOLUCION_POR_COMITE:
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Advertencia',
                    detail: EstadoProceso.DEVUELTO_GENERACION_DE_RESOLUCION_POR_COMITE,
                    life: 2000,
                });
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = false;
                break;
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE3_GENERACION_RESOLUCION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = false;
                break;
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_DOCENTE_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                break;
            default:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                break;
        }

        this.updateFormFields(this.role);
    }

    //#region PDF VIEWER
    async loadPdfFiles() {
        const filesToConvert = [
            this.FileAnteproyectoFinal,
            this.FileSolicitudComite,
            this.FileSolicitudConsejo,
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

    setup(fieldName: string) {
        this.trabajoDeGradoService
            .getFile(this.resolucionForm.get(fieldName).value)
            .subscribe({
                next: (response: any) => {
                    if (response) {
                        const byteCharacters = atob(response);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const file = new File([byteArray], fieldName, {
                            type: response.type,
                        });
                        switch (fieldName) {
                            case 'linkAnteproyectoFinal':
                                this.FileAnteproyectoFinal = file;
                                break;
                            case 'linkSolicitudComite':
                                this.FileSolicitudComite = file;
                                break;
                            case 'linkSolicitudConsejoFacultad':
                                this.FileSolicitudConsejo = file;
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

    setValuesForm(resolucion: Resolucion) {
        this.resolucionForm.patchValue({
            ...resolucion,
        });
    }

    loadResolucion(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.isLoading = true;

            const docenteObs =
                this.role.includes('ROLE_DOCENTE') ||
                this.role.includes('ROLE_COORDINADOR')
                    ? this.resolucionService.getResolucionDocente(
                          this.trabajoDeGradoId
                      )
                    : of(null);

            const coordinadorFase1Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.resolucionService.getResolucionCoordinadorFase1(
                      this.trabajoDeGradoId
                  )
                : of(null);

            const coordinadorFase2Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.resolucionService.getResolucionCoordinadorFase2(
                      this.trabajoDeGradoId
                  )
                : of(null);
            const coordinadorFase3Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.resolucionService.getResolucionCoordinadorFase3(
                      this.trabajoDeGradoId
                  )
                : of(null);

            forkJoin({
                docente: docenteObs,
                coordinadorFase1: coordinadorFase1Obs,
                coordinadorFase2: coordinadorFase2Obs,
                coordinadorFase3: coordinadorFase3Obs,
            }).subscribe({
                next: (responses) => {
                    if (responses.docente) {
                        const data = responses.docente;
                        this.setValuesForm(data);

                        this.trabajoDeGradoService.setTituloSeleccionadoSubject(
                            data.titulo
                        );

                        this.expertoService
                            .obtenerExperto(Number(data.codirector))
                            .subscribe({
                                next: (response) => {
                                    this.codirectorSeleccionado =
                                        this.mapCodirectorLabel(response);
                                    this.codirector.setValue(response.id);
                                },
                            });

                        this.docenteService
                            .obtenerDocente(Number(data.director))
                            .subscribe({
                                next: (response) => {
                                    this.directorSeleccionado =
                                        this.mapDirectorLabel(response);
                                    this.director.setValue(response.id);
                                },
                            });
                    }

                    if (responses.coordinadorFase1) {
                        const data = responses.coordinadorFase1;
                        data.conceptoDocumentosCoordinador
                            ? this.resolucionForm
                                  .get('conceptoDocumentosCoordinador')
                                  .setValue('Aceptado')
                            : this.resolucionForm
                                  .get('conceptoDocumentosCoordinador')
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

                        this.resolucionForm
                            .get('fechaActa')
                            .setValue(actaDate ? new Date(actaDate) : null);

                        this.resolucionForm
                            .get('numeroActa')
                            .setValue(actaNumber ? actaNumber : null);

                        this.resolucionForm
                            .get('conceptoComite')
                            .setValue(
                                actaConceptoComite ? 'Aceptado' : 'Rechazado'
                            );
                    }

                    if (responses.coordinadorFase3) {
                        const data = responses.coordinadorFase3;

                        this.setValuesForm(data);

                        this.resolucionForm
                            .get('fechaActaConsejoFacultad')
                            .setValue(
                                data?.fechaActaConsejoFacultad
                                    ? new Date(data.fechaActaConsejoFacultad)
                                    : null
                            );
                    }
                },
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    if (this.role.includes('ROLE_DOCENTE')) {
                        this.setup('linkAnteproyectoFinal');
                        this.setup('linkSolicitudComite');
                    }
                    if (this.role.includes('ROLE_COORDINADOR')) {
                        this.setup('linkAnteproyectoFinal');
                        this.setup('linkSolicitudComite');
                        this.setup('linkSolicitudConsejoFacultad');
                    }
                    this.isLoading = false;
                    resolve();
                },
            });
        });
    }

    async updateResolucion() {
        this.isLoading = true;
        try {
            if (this.role.includes('ROLE_DOCENTE')) {
                if (
                    this.estado ==
                        EstadoProceso.DEVUELTO_GENERACION_DE_RESOLUCION_POR_COORDINADOR ||
                    this.estado ==
                        EstadoProceso.DEVUELTO_GENERACION_DE_RESOLUCION_POR_COMITE
                ) {
                    await lastValueFrom(
                        this.resolucionService.updateResolucionDocente(
                            this.resolucionForm.value,
                            this.trabajoDeGradoId
                        )
                    );
                } else {
                    this.isLoading = false;
                    return this.messageService.add(
                        errorMessage('No puedes modificar los datos.')
                    );
                }
            }

            if (
                this.role.includes('ROLE_COORDINADOR') == true &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == false &&
                this.isCoordinadorFase2Created == false
            ) {
                const base64AnteproyectoFinal = await this.formatFileString(
                    this.FileAnteproyectoFinal
                );
                const base64SolicitudComite = await this.formatFileString(
                    this.FileSolicitudComite
                );

                const resolucionData =
                    this.resolucionForm.get('conceptoDocumentosCoordinador')
                        .value == 'Aceptado'
                        ? {
                              conceptoDocumentosCoordinador: true,
                              envioEmailDto: {
                                  asunto: this.resolucionForm.get(
                                      'asuntoCoordinador'
                                  ).value,
                                  mensaje:
                                      this.resolucionForm.get(
                                          'mensajeCoordinador'
                                      ).value,
                              },
                              obtenerDocumentosParaEnvioDto: {
                                  base64AnteproyectoFinal,
                                  base64SolicitudComite,
                              },
                          }
                        : {
                              conceptoDocumentosCoordinador: false,
                              envioEmailDto: {
                                  asunto: this.resolucionForm.get(
                                      'asuntoCoordinador'
                                  ).value,
                                  mensaje:
                                      this.resolucionForm.get(
                                          'mensajeCoordinador'
                                      ).value,
                              },
                          };

                await lastValueFrom(
                    this.resolucionService.createResolucionCoordinadorFase1(
                        resolucionData,
                        this.trabajoDeGradoId
                    )
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') == true &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == false
            ) {
                const {
                    numeroActa,
                    fechaActa,
                    linkSolicitudConsejoFacultad,
                    ...restFormValues
                } = this.resolucionForm.value;

                const resolucionData =
                    this.resolucionForm.get('conceptoComite').value ==
                    'Aceptado'
                        ? {
                              actaFechaRespuestaComite: [
                                  {
                                      conceptoComite: true,
                                      numeroActa,
                                      fechaActa,
                                  },
                              ],
                              envioEmail: {
                                  asunto: this.resolucionForm.get(
                                      'asuntoComite'
                                  ).value,
                                  mensaje:
                                      this.resolucionForm.get('mensajeComite')
                                          .value,
                              },
                              linkSolicitudConsejoFacultad,
                          }
                        : {
                              actaFechaRespuestaComite: [
                                  {
                                      conceptoComite: false,
                                      numeroActa,
                                      fechaActa,
                                  },
                              ],
                              envioEmail: {
                                  asunto: this.resolucionForm.get(
                                      'asuntoComite'
                                  ).value,
                                  mensaje:
                                      this.resolucionForm.get('mensajeComite')
                                          .value,
                              },
                          };

                await lastValueFrom(
                    this.resolucionService.createResolucionCoordinadorFase2(
                        resolucionData,
                        this.trabajoDeGradoId
                    )
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') == true &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true
            ) {
                await lastValueFrom(
                    this.resolucionService.createResolucionCoordinadorFase3(
                        this.resolucionForm.value,
                        this.trabajoDeGradoId
                    )
                );
            } else {
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

    createResolucion(): void {
        this.isLoading = true;
        if (
            this.role.includes('ROLE_DOCENTE') == true &&
            this.isDocenteCreated == false
        ) {
            this.resolucionService
                .createResolucionDocente(
                    this.resolucionForm.value,
                    this.trabajoDeGradoId
                )
                .subscribe({
                    next: (response) => {
                        if (response) {
                            this.trabajoDeGradoService.setResolucionSeleccionada(
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
        }
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

    onFileSelectFirst(event: any) {
        this.FileAnteproyectoFinal = this.uploadFileAndSetValue(
            'linkAnteproyectoFinal',
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
        this.FileSolicitudConsejo = this.uploadFileAndSetValue(
            'linkSolicitudConsejoFacultad',
            event
        );
    }

    onFileClear(field: string) {
        if (field == 'linkAnteproyectoFinal') {
            this.FileAnteproyectoFinal = null;
            this.AnteproyectoFinal.clear();
            this.resolucionForm.get('linkAnteproyectoFinal').reset();
        }
        if (field == 'linkSolicitudComite') {
            this.FileSolicitudComite = null;
            this.SolicitudComite.clear();
            this.resolucionForm.get('linkSolicitudComite').reset();
        }
        if (field == 'linkSolicitudConsejoFacultad') {
            this.FileSolicitudConsejo = null;
            this.SolicitudConsejo.clear();
            this.resolucionForm.get('linkSolicitudConsejoFacultad').reset();
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
        this.trabajoDeGradoService
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

    //#region Director and Coodirector
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

    mapDirectorLabel(docente: any) {
        return {
            id: docente.id,
            nombre: docente.nombre,
            apellido: docente.apellido,
            correo: docente.correoElectronico ?? docente.correo,
            universidad: docente.universidad,
        };
    }

    mapCodirectorLabel(experto: any) {
        return {
            id: experto.id,
            nombre: experto.nombre,
            apellido: experto.apellido,
            correo: experto.correoElectronico ?? experto.correo,
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
                    const coodirector = this.mapCodirectorLabel(response);
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
    //#endregion

    redirectToSolicitud(trabajoDeGradoId: number) {
        this.router.navigate([
            `examen-de-valoracion/solicitud/editar/${trabajoDeGradoId}`,
        ]);
    }

    redirectToRespuesta() {
        this.router.navigate(['examen-de-valoracion/respuesta']);
    }

    redirectToSustentacion(sustentacionId: number) {
        sustentacionId
            ? this.router.navigate([
                  `examen-de-valoracion/sustentacion/editar/${this.trabajoDeGradoId}`,
              ])
            : this.router.navigate(['examen-de-valoracion/sustentacion']);
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
