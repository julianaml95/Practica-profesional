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
import { Subscription, forkJoin, last, lastValueFrom, of, timer } from 'rxjs';
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
import { Aviso, EstadoProceso, Mensaje } from 'src/app/core/enums/enums';
import { Sustentacion } from '../../models/sustentacion';
import { AuthService } from '../../services/auth.service';
import { BuscadorDocentesComponent } from 'src/app/shared/components/buscador-docentes/buscador-docentes.component';
import { BuscadorExpertosComponent } from 'src/app/shared/components/buscador-expertos/buscador-expertos.component';
import { Experto } from '../../models/experto';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { DialogService } from 'primeng/dynamicdialog';
import { DocenteService } from 'src/app/shared/services/docente.service';
import { ExpertoService } from 'src/app/shared/services/experto.service';

@Component({
    selector: 'app-sustentacion-examen',
    templateUrl: './sustentacion-examen.component.html',
    styleUrls: ['./sustentacion-examen.component.scss'],
})
export class SustentacionExamenComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();
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

    isDocenteCreated: boolean = false;
    isCoordinadorFase1Created: boolean = false;
    isEstudianteCreated: boolean = false;
    isCoordinadorFase2Created: boolean = false;
    isCoordinadorFase3Created: boolean = false;
    isLoading: boolean = false;
    errorMessageShown: boolean = false;
    editMode: boolean = false;

    role: string[];
    estado: string;

    trabajoDeGradoId: number;
    respuestaId: number;
    resolucionId: number;
    sustentacionId: number;

    sustentacionForm: FormGroup;

    estudianteSeleccionado: Estudiante = {};
    juradoExternoSeleccionado: Experto;
    juradoInternoSeleccionado: Docente;

    estados: string[] = ['Aprobado', 'No Aprobado'];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private solicitudService: SolicitudService,
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
        await this.loadSustentacion();
        this.checkEstados();
    }

    initForm(): void {
        this.sustentacionForm = this.fb.group({
            idTrabajoGrados: [null, Validators.required],
            idSustentacionTI: [null, Validators.required],
            linkFormatoF: ['', Validators.required],
            urlDocumentacion: ['', Validators.required],
            linkFormatoG: ['', Validators.required],
            linkEstudioHojaVidaAcademica: ['', Validators.required],
            juradosAceptados: [''],
            idJuradoInterno: ['', Validators.required],
            idJuradoExterno: ['', Validators.required],
            numeroActa: ['', Validators.required],
            fechaActa: ['', Validators.required],
            linkFormatoH: ['', Validators.required],
            linkFormatoI: ['', Validators.required],
            linkActaSustentacionPublica: ['', Validators.required],
            respuestaSustentacion: [null, Validators.required],
            linkEstudioHojaVidaAcademicaGrado: ['', Validators.required],
            numeroActaFinal: ['', Validators.required],
            fechaActaFinal: ['', Validators.required],
        });

        this.formReady.emit(this.sustentacionForm);
    }

    updateFormFields(role: string[]): void {
        const formControls = this.sustentacionForm.controls;

        for (const control in formControls) {
            formControls[control].disable();
        }

        formControls['idTrabajoGrados'].enable();

        if (role.includes('ROLE_DOCENTE')) {
            formControls['linkFormatoF'].enable();
            formControls['urlDocumentacion'].enable();
            formControls['idJuradoInterno'].enable();
            formControls['idJuradoExterno'].enable();
        }

        if (role.includes('ROLE_ESTUDIANTE')) {
            if (
                this.isCoordinadorFase2Created &&
                !this.isCoordinadorFase3Created
            ) {
                formControls['linkFormatoH'].enable();
                formControls['linkFormatoI'].enable();
            }
        }

        if (role.includes('ROLE_COORDINADOR')) {
            if (this.isDocenteCreated && !this.isCoordinadorFase1Created) {
                formControls['linkFormatoG'].enable();
                formControls['linkEstudioHojaVidaAcademica'].enable();
            }

            if (
                this.isCoordinadorFase1Created &&
                !this.isCoordinadorFase2Created
            ) {
                formControls['numeroActa'].enable();
                formControls['fechaActa'].enable();
                formControls['juradosAceptados'].enable();
                formControls['idJuradoInterno'].enable();
                formControls['idJuradoExterno'].enable();
            }

            if (this.isEstudianteCreated) {
                formControls['linkActaSustentacionPublica'].enable();
                formControls['respuestaSustentacion'].enable();
                formControls['linkEstudioHojaVidaAcademicaGrado'].enable();
                formControls['numeroActaFinal'].enable();
                formControls['fechaActaFinal'].enable();
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
                        this.trabajoDeGradoId = response.id;
                        this.estado = response.estado;
                        this.sustentacionForm
                            .get('idTrabajoGrados')
                            .setValue(response.id);
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
        this.solicitudService.evaluadorExternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.juradoExternoSeleccionado = response;
                    this.juradoExterno?.setValue(response.id);
                } else {
                    this.messageService.add(
                        warnMessage('Debes seleccionar un evaluador externo')
                    );
                    this.router.navigate([
                        `examen-de-valoracion/solicitud/editar/${this.trabajoDeGradoId}`,
                    ]);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
        this.solicitudService.evaluadorInternoSeleccionadoSubject$.subscribe({
            next: (response) => {
                if (response) {
                    this.juradoInternoSeleccionado = response;
                    this.juradoInterno?.setValue(response.id);
                } else {
                    this.messageService.add(
                        warnMessage('Debes seleccionar un evaluador interno')
                    );
                    this.router.navigate([
                        `examen-de-valoracion/solicitud/editar/${this.trabajoDeGradoId}`,
                    ]);
                }
            },
            error: (e) => this.handlerResponseException(e),
        });
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
        const addMessage = (
            severity: string,
            summary: string,
            detail: string
        ) => {
            this.messageService.add({
                severity,
                summary,
                detail,
                life: 5000,
            });
        };

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
                addMessage(
                    'info',
                    'Información',
                    EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_DOCENTE_SUSTENTACION
                );
                this.isDocenteCreated = false;
                this.isCoordinadorFase1Created = false;
                this.isCoordinadorFase2Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase3Created = false;

                if (this.role.includes('ROLE_COORDINADOR')) {
                    this.router.navigate(['examen-de-valoracion']);
                }
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE1_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase2Created = false;
                this.isCoordinadorFase3Created = false;
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE2_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase3Created = false;
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_ESTUDIANTE_SUSTENTACION:
                addMessage(
                    'info',
                    'Información',
                    EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_ESTUDIANTE_SUSTENTACION
                );

                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase3Created = false;

                if (
                    this.role.includes('ROLE_COORDINADOR') ||
                    this.role.includes('ROLE_DOCENTE')
                ) {
                    this.router.navigate(['examen-de-valoracion']);
                }
                break;

            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE3_SUSTENTACION:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isCoordinadorFase2Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase3Created = false;
                break;

            case EstadoProceso.SUSTENTACION_APROBADA:
                addMessage(
                    'success',
                    'Información',
                    EstadoProceso.SUSTENTACION_APROBADA
                );
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                break;

            case EstadoProceso.SUSTENTACION_NO_APROBADA:
                addMessage(
                    'error',
                    'Información',
                    EstadoProceso.SUSTENTACION_NO_APROBADA
                );
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                break;

            // case EstadoProceso.SUSTENTACION_APLAZADA:
            //     addMessage(
            //         'warn',
            //         'Información',
            //         EstadoProceso.SUSTENTACION_APLAZADA
            //     );
            //     this.isDocenteCreated = true;
            //     this.isCoordinadorFase1Created = true;
            //     this.isEstudianteCreated = true;
            //     this.isCoordinadorFase2Created = true;
            //     this.isCoordinadorFase3Created = true;
            //     break;

            default:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                break;
        }

        this.updateFormFields(this.role);
    }

    setValuesForm(sustentacion: Sustentacion) {
        this.sustentacionForm.patchValue({
            ...sustentacion,
        });
    }

    async loadSustentacion(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const docenteObs = this.sustentacionService.getSustentacionDocente(
                this.trabajoDeGradoId
            );
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
            const estudianteObs =
                this.role.includes('ROLE_COORDINADOR') ||
                this.role.includes('ROLE_ESTUDIANTE')
                    ? this.sustentacionService.getSustentacionEstudiante(
                          this.trabajoDeGradoId
                      )
                    : of(null);
            const coordinadorFase3Obs = this.role.includes('ROLE_COORDINADOR')
                ? this.sustentacionService.getSustentacionCoordinadorFase3(
                      this.trabajoDeGradoId
                  )
                : of(null);

            forkJoin({
                docente: docenteObs,
                coordinadorFase1: coordinadorFase1Obs,
                coordinadorFase2: coordinadorFase2Obs,
                estudiante: estudianteObs,
                coordinadorFase3: coordinadorFase3Obs,
            }).subscribe({
                next: (responses) => {
                    if (responses.docente) {
                        const data = responses.docente;
                        this.setValuesForm(data);
                        this.isDocenteCreated = true;

                        this.sustentacionForm
                            .get('idTrabajoGrados')
                            .setValue(this.trabajoDeGradoId);
                    }

                    if (responses.coordinadorFase1) {
                        const data = responses.coordinadorFase1;
                        this.setValuesForm(data);
                    }

                    if (responses.coordinadorFase2) {
                        const data = responses.coordinadorFase2;
                        this.setValuesForm(data);

                        this.expertoService
                            .obtenerExperto(Number(data?.juradoExterno?.id))
                            .subscribe({
                                next: (response) => {
                                    this.juradoExternoSeleccionado =
                                        this.mapJuradoExternoLabel(response);
                                    this.juradoExterno.setValue(response.id);
                                },
                            });

                        this.docenteService
                            .obtenerDocente(Number(data?.juradoInterno?.id))
                            .subscribe({
                                next: (response) => {
                                    this.juradoInternoSeleccionado =
                                        this.mapJuradoInternoLabel(response);
                                    this.juradoInterno.setValue(response.id);
                                },
                            });
                    }

                    if (responses.estudiante) {
                        const data = responses.estudiante;
                        this.setValuesForm(data);
                    }

                    if (responses.coordinadorFase3) {
                        const data = responses.coordinadorFase3;
                        this.setValuesForm(data);

                        this.sustentacionForm
                            .get('juradosAceptados')
                            .setValue(
                                data?.juradosAceptados == 1
                                    ? 'aceptado'
                                    : 'rechazado'
                            );

                        this.sustentacionForm
                            .get('respuestaSustentacion')
                            .setValue(
                                data?.respuestaSustentacion == 1
                                    ? 'Aprobado'
                                    : 'No Aprobado'
                            );

                        this.sustentacionForm
                            .get('fechaActa')
                            .setValue(
                                data?.fechaActa
                                    ? new Date(data?.fechaActa)
                                    : null
                            );

                        this.sustentacionForm
                            .get('fechaActaFinal')
                            .setValue(
                                data?.fechaActaFinal
                                    ? new Date(data.fechaActaFinal)
                                    : null
                            );
                        const respuestaSustentacion =
                            data?.respuestaSustentacion == true
                                ? 'Aprobado'
                                : 'No Aprobado';
                        this.sustentacionForm
                            .get('respuestaSustentacion')
                            .setValue(respuestaSustentacion);
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
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.sustentacionId = id;
        this.isLoading = true;

        try {
            if (
                this.role.includes('ROLE_COORDINADOR') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == false
            ) {
                const envioEmailComiteDto = {
                    asunto: 'Revision documentos al consejo',
                    mensaje: 'Envio documento para revision en sustentacion',
                };

                const sustentacionData = {
                    ...this.sustentacionForm.value,
                    envioEmailComiteDto,
                };

                await lastValueFrom(
                    this.sustentacionService.createSustentacionCoordinadorFase1(
                        sustentacionData
                    )
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == false
            ) {
                const sustentacionData = { ...this.sustentacionForm.value };
                sustentacionData.juradosAceptados =
                    sustentacionData.juradosAceptados == 'aceptado'
                        ? true
                        : false;

                await lastValueFrom(
                    this.sustentacionService.createSustentacionCoordinadorFase2(
                        sustentacionData
                    )
                );
            } else if (
                this.role.includes('ROLE_ESTUDIANTE') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isEstudianteCreated == false
            ) {
                await lastValueFrom(
                    this.sustentacionService.createSustentacionEstudiante(
                        this.sustentacionForm.value
                    )
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isEstudianteCreated == true &&
                this.isCoordinadorFase3Created == false
            ) {
                const formValue = { ...this.sustentacionForm.value };
                formValue.respuestaSustentacion =
                    formValue.respuestaSustentacion == 'Aprobado'
                        ? true
                        : false;

                await lastValueFrom(
                    this.sustentacionService.createSustentacionCoordinadorFase3(
                        formValue
                    )
                );
            } else if (
                this.role.includes('ROLE_ESTUDIANTE') &&
                this.isDocenteCreated == true &&
                this.isCoordinadorFase1Created == true &&
                this.isCoordinadorFase2Created == true &&
                this.isEstudianteCreated == true
            ) {
                this.isLoading = false;
                return this.messageService.add(
                    errorMessage('No puedes modificar los datos.')
                );
            } else if (
                this.role.includes('ROLE_COORDINADOR') ||
                (this.role.includes('ROLE_DOCENTE') &&
                    this.isDocenteCreated == true &&
                    this.isCoordinadorFase1Created == true &&
                    this.isCoordinadorFase2Created == true &&
                    this.isEstudianteCreated == true &&
                    this.isCoordinadorFase3Created == true)
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
                .createSustentacionDocente(this.sustentacionForm.value)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            this.solicitudService.setSustentacionSeleccionada(
                                response
                            );
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.router.navigate([
                                    `examen-de-valoracion/sustentacion/editar/${response.idSustentacionTI}`,
                                ]);
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
