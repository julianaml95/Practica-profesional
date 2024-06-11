import {
    Component,
    EventEmitter,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin, of, timer } from 'rxjs';
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
    // @ViewChild('EstudioHVA') EstudioHVA!: FileUpload;
    @ViewChild('FormatoH') FormatoH!: FileUpload;
    @ViewChild('FormatoI') FormatoI!: FileUpload;
    @ViewChild('ActaSustentacionP') ActaSustentacionP!: FileUpload;
    @ViewChild('EstudioHVAGrado') EstudioHVAGrado!: FileUpload;
    
    FileFormatoF: File | null = null;
    FileFormatoG: File | null = null;
    // FileEstudioHVA: File | null = null;
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

    estados: string[] = ['Aprobado', 'No Aprobado'];

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private solicitudService: SolicitudService,
        private sustentacionService: SustentacionService,
        private breadcrumbService: BreadcrumbService,
        private messageService: MessageService,
        private authService: AuthService
    ) {}

    async ngOnInit() {
        this.initForm();
        this.subscribeToObservers();
        this.updateFormFields(this.role);
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
            // linkEstudioHojaVidaAcademica: ['', Validators.required],
            juradoExterno: ['1', Validators.required],
            juradoInterno: ['1', Validators.required],
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

        formControls['idTrabajoGrados'].enable()
    
        if (role.includes('ROLE_DOCENTE')) {
            formControls['linkFormatoF'].enable();
            formControls['urlDocumentacion'].enable();
        }
    
        if (role.includes('ROLE_ESTUDIANTE')) {
            if (!this.isEstudianteCreated && this.isCoordinadorFase2Created) {
                formControls['linkFormatoH'].enable();
                formControls['linkFormatoI'].enable();
            }
        }
    
        if (role.includes('ROLE_COORDINADOR')) {
            if (!this.isCoordinadorFase1Created && this.isDocenteCreated) {
                formControls['linkFormatoG'].enable();
            }
            // formControls['linkEstudioHojaVidaAcademica'].enable();
    
                // formControls['juradoExterno'].enable();
                // formControls['juradoInterno'].enable();
                if (!this.isCoordinadorFase2Created && this.isCoordinadorFase1Created) {
            formControls['numeroActa'].enable();
            formControls['fechaActa'].enable();
                }

                if (this.isCoordinadorFase2Created) {

            formControls['linkActaSustentacionPublica'].enable();
            formControls['respuestaSustentacion'].enable();
            formControls['linkEstudioHojaVidaAcademicaGrado'].enable();
            formControls['numeroActaFinal'].enable();
            formControls['fechaActaFinal'].enable();}
            
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
        this.trabajoSeleccionadoSubscription = this.solicitudService.trabajoSeleccionadoSubject$.subscribe({
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
    }

    setup(fieldName: string) {
        if (Object.keys(this.estudianteSeleccionado).length > 0) {
            this.solicitudService
                .getFile(this.sustentacionForm.get(fieldName).value)
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
                                case 'linkFormatoF':
                                    this.FileFormatoF = file;
                                    break;
                                case 'linkFormatoG':
                                    this.FileFormatoG = file;
                                    break;
                                // case 'linkEstudioHojaVidaAcademica':
                                //     this.FileEstudioHVA = file;
                                //     break;
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
        let shouldUpdateFormFields = false;
    
        const addMessage = (severity: string, summary: string, detail: string) => {
            this.messageService.add({
                severity,
                summary,
                detail,
                life: 10000
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
                addMessage('info', 'Información', EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_DOCENTE_SUSTENTACION);
                this.isDocenteCreated = false;
                this.isCoordinadorFase1Created = false;
                this.isCoordinadorFase2Created = false;
                this.isEstudianteCreated = false;
                this.isCoordinadorFase3Created = false;
                break;
    
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE1_SUSTENTACION:
                if (this.isDocenteCreated) {
                    addMessage('info', 'Información', EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE1_SUSTENTACION);
                    this.isDocenteCreated = true;
                    this.isCoordinadorFase1Created = false;
                    this.isEstudianteCreated = false;
                    this.isCoordinadorFase2Created = false;
                    this.isCoordinadorFase3Created = false;
                } else {
                    addMessage('error', 'Error', 'El formulario del docente debe ser completado antes de proceder.');
                }
                break;
                
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE2_SUSTENTACION:
                            if (this.isDocenteCreated && this.isCoordinadorFase1Created) {
                                addMessage('info', 'Información', EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE2_SUSTENTACION);
                                this.isDocenteCreated = true;
                                this.isCoordinadorFase1Created = true;
                                this.isCoordinadorFase2Created = false;
                                this.isEstudianteCreated = false;
                                this.isCoordinadorFase3Created = false;
                                shouldUpdateFormFields = true;
                            } else {
                                addMessage('error', 'Error', 'El formulario del coordinador en la fase 1 debe ser completado antes de proceder.');
                            }
                            break;
    
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_ESTUDIANTE_SUSTENTACION:
                if (this.isDocenteCreated && this.isCoordinadorFase1Created && this.isCoordinadorFase2Created) {
                    addMessage('info', 'Información', EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_ESTUDIANTE_SUSTENTACION);
                    this.isDocenteCreated = true;
                    this.isCoordinadorFase1Created = true;
                    this.isCoordinadorFase2Created = true;
                    this.isEstudianteCreated = false;
                    this.isCoordinadorFase3Created = false;
                } else {
                    addMessage('error', 'Error', 'El formulario del coordinador en la fase 2 debe ser completado antes de proceder.');
                }
                break;
    
            case EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE3_SUSTENTACION:
                if (this.isDocenteCreated && this.isCoordinadorFase1Created && this.isCoordinadorFase2Created && this.isEstudianteCreated) {
                    addMessage('info', 'Información', EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_COORDINADOR_FASE3_SUSTENTACION);
                    this.isDocenteCreated = true;
                    this.isCoordinadorFase1Created = true;
                    this.isCoordinadorFase2Created = true;
                    this.isEstudianteCreated = true;
                    this.isCoordinadorFase3Created = false;
                    shouldUpdateFormFields = true;
                } else {
                    addMessage('error', 'Error', 'El formulario del estudiante debe ser completado antes de proceder.');
                }
                break;
    
            case EstadoProceso.SUSTENTACION_APROBADA:
                addMessage('success', 'Información', EstadoProceso.SUSTENTACION_APROBADA);
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                shouldUpdateFormFields = true;
                break;
    
            case EstadoProceso.SUSTENTACION_NO_APROBADA:
                addMessage('error', 'Información', EstadoProceso.SUSTENTACION_NO_APROBADA);
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                shouldUpdateFormFields = true;
                break;
    
            case EstadoProceso.SUSTENTACION_APLAZADA:
                addMessage('warn', 'Información', EstadoProceso.SUSTENTACION_APLAZADA);
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                shouldUpdateFormFields = true;
                break;
    
            default:
                this.isDocenteCreated = true;
                this.isCoordinadorFase1Created = true;
                this.isEstudianteCreated = true;
                this.isCoordinadorFase2Created = true;
                this.isCoordinadorFase3Created = true;
                shouldUpdateFormFields = true;
                break;
        }
    
        if (shouldUpdateFormFields) {
            this.updateFormFields(this.role);
        }
    }    

    setValuesForm(sustentacion: Sustentacion) {
        this.sustentacionForm.patchValue({
            ...sustentacion,
        });
    }

    async loadSustentacion(): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            const docenteObs = this.sustentacionService.getSustentacionDocente(this.trabajoDeGradoId);
            const coordinadorFase1Obs = this.role.includes('ROLE_COORDINADOR') ? this.sustentacionService.getSustentacionCoordinadorFase1(this.trabajoDeGradoId) : of(null);
            const coordinadorFase2Obs = this.role.includes('ROLE_COORDINADOR') ? this.sustentacionService.getSustentacionCoordinadorFase2(this.trabajoDeGradoId) : of(null);
            const estudianteObs = this.role.includes('ROLE_COORDINADOR') || this.role.includes('ROLE_ESTUDIANTE') ? this.sustentacionService.getSustentacionEstudiante(this.trabajoDeGradoId) : of(null);
            const coordinadorFase3Obs = this.role.includes('ROLE_COORDINADOR') ? this.sustentacionService.getSustentacionCoordinadorFase2(this.trabajoDeGradoId) : of(null);
    
            forkJoin({
                docente: docenteObs,
                coordinadorFase1: coordinadorFase1Obs,
                coordinadorFase2: coordinadorFase2Obs,
                estudiante: estudianteObs,
                coordinadorFase3: coordinadorFase3Obs
            }).subscribe({
                next: (responses) => {
                    if (responses.docente) {
                        const data = responses.docente;
                        console.log(data);
                        this.setValuesForm(data);
                        this.isDocenteCreated = true;
                        
                        this.sustentacionForm
                            .get('idTrabajoGrados')
                            .setValue(this.trabajoDeGradoId);
                    }
    
                    if (responses.coordinadorFase1) {
                        const data = responses.coordinadorFase1;
                        console.log(data);
                        this.setValuesForm(data);
                        if (data.linkFormatoG !== null) {
                            this.isCoordinadorFase1Created = true;
                        }
                    }
    
                    if (responses.coordinadorFase2) {
                        const data = responses.coordinadorFase2;
                        console.log(data);
                        this.setValuesForm(data);
                        this.sustentacionForm
                            .get('fechaActa')
                            .setValue(
                                data?.fechaActa
                                    ? new Date(data.fechaActa)
                                    : null
                            );
                        if (data.fechaActa !== null) {
                            this.isCoordinadorFase2Created = true;
                        }
                    }

                    if (responses.estudiante) {
                        const data = responses.estudiante;
                        console.log(data);
                        this.setValuesForm(data);
                        if (data.linkFormatoH !== null) {
                            this.isEstudianteCreated = true;
                        }
                    }

                    if (responses.coordinadorFase3) {
                        const data = responses.coordinadorFase3;
                        console.log(data);
                        this.setValuesForm(data);
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
                        if (data.fechaActaFinal !== null) {
                            this.isCoordinadorFase3Created = true;
                        }
                    }
                },
                error: (e) => this.handlerResponseException(e),
                complete: () => {
                    if (this.role.includes('ROLE_DOCENTE')){
                        this.setup('linkFormatoF');
                    }

                    if (this.role.includes("ROLE_ESTUDIANTE")) {
                        this.setup('linkFormatoH');
                        this.setup('linkFormatoI');
                    }

                    if (this.role.includes('ROLE_COORDINADOR')){
                        this.setup('linkFormatoF');
                        this.setup('linkFormatoH');
                        this.setup('linkFormatoI');
                        this.setup('linkFormatoG');
                        this.setup('linkActaSustentacionPublica');
                        this.setup('linkEstudioHojaVidaAcademicaGrado');
                    }
                    this.isLoading = false;
                    resolve();
                },
            });

        // this.isLoading = true;
        // this.sustentacionService
        //     .getSustentacionDocente(this.trabajoDeGradoId)
        //     .subscribe({
        //         next: (response) => {
        //             if (response) {
        //                 const data = response;
        //                 this.setValuesForm(data);

        //                 this.sustentacionForm
        //                     .get('idTrabajoGrados')
        //                     .setValue(this.trabajoDeGradoId);

        //                 const respuestaSustentacion =
        //                     data?.respuestaSustentacion == true
        //                         ? 'Aprobado'
        //                         : 'No Aprobado';
        //                 this.sustentacionForm
        //                     .get('respuestaSustentacion')
        //                     .setValue(respuestaSustentacion);
        //                 this.sustentacionForm
        //                     .get('fechaActa')
        //                     .setValue(
        //                         data?.fechaActa
        //                             ? new Date(data?.fechaActa)
        //                             : null
        //                     );
        //             }
        //         },
        //         error: (e) => this.handlerResponseException(e),
        //         complete: () => {
        //             this.setup('linkRemisionDocumentoFinal');
        //             this.isLoading = false;
        //         },
        //     });

        })
    }

    updateSustentacion(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.sustentacionId = id;
        this.isLoading = true;

        const formValue = { ...this.sustentacionForm.value };
        formValue.respuestaSustentacion =
            formValue.respuestaSustentacion === 'Aprobado' ? 1 : 0;

        // if (
        //     (this.role.includes('ROLE_COORDINADOR') ||
        //         this.role.includes('ROLE_DOCENTE') ||
        //         this.role.includes('ROLE_COMITE')) &&
        //     this.isComiteCreated == true &&
        //     this.isDocenteCreated == true &&
        //     this.isCoordinadorFase1Created == true
        // ) {
        //     this.sustentacionService
        //         .updateSustentacion(formValue, this.sustentacionId)
        //         .subscribe({
        //             next: (_) => {},
        //             error: (e) => this.handlerResponseException(e),
        //             complete: () => {
        //                 timer(2000).subscribe(() => {
        //                     this.isLoading = false;
        //                     this.messageService.add(
        //                         infoMessage(Mensaje.ACTUALIZACION_EXITOSA)
        //                     );
        //                 });
        //             },
        //         });
        // }

        if (
            this.role.includes('ROLE_COORDINADOR') &&
            this.isDocenteCreated == true &&
            this.isCoordinadorFase1Created == false
        ) {
            this.sustentacionService
                .createSustentacionCoordinadorFase1(formValue)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.messageService.add(
                                    infoMessage(Mensaje.GUARDADO_EXITOSO)
                                );
                            });
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }

        if (
            this.role.includes('ROLE_COORDINADOR') &&
            this.isDocenteCreated == true &&
            this.isCoordinadorFase1Created == true &&
            this.isCoordinadorFase2Created == false
        ) {
            formValue.juradoInterno = '1'
            formValue.juradoExterno = '1'

            this.sustentacionService
                .createSustentacionCoordinadorFase2(formValue)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.messageService.add(
                                    infoMessage(Mensaje.GUARDADO_EXITOSO)
                                );
                            });
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }

        if (
            this.role.includes('ROLE_ESTUDIANTE') &&
            this.isDocenteCreated == true &&
            this.isCoordinadorFase1Created == true &&
            this.isCoordinadorFase2Created == true &&
            this.isEstudianteCreated == false
        ) {
            this.sustentacionService
                .createSustentacionEstudiante(formValue)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.messageService.add(
                                    infoMessage(Mensaje.GUARDADO_EXITOSO)
                                );
                            });
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }

        if (
            this.role.includes('ROLE_COORDINADOR') &&
            this.isDocenteCreated == true &&
            this.isCoordinadorFase1Created == true &&
            this.isCoordinadorFase2Created == true &&
            this.isEstudianteCreated == true &&
            this.isCoordinadorFase3Created == false
        ) {
            this.sustentacionService
                .createSustentacionCoordinadorFase3(formValue)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            timer(2000).subscribe(() => {
                                this.isLoading = false;
                                this.messageService.add(
                                    infoMessage(Mensaje.GUARDADO_EXITOSO)
                                );
                            });
                        }
                    },
                    error: (e) => this.handlerResponseException(e),
                });
        }

        // if (
        //     (this.role.includes('ROLE_COORDINADOR') ||
        //         this.role.includes('ROLE_DOCENTE')) &&
        //     this.isDocenteCreated == true &&
        //     this.isComiteCreated == false &&
        //     this.isCoordinadorFase1Created == false
        // ) {
        //     this.isLoading = false;
        //     // this.messageService.add(
        //     //     warnMessage(Mensaje.CAMPOS_COMITE_PENDIENTE)
        //     // );
        // }

        // if (
        //     (this.role.includes('ROLE_DOCENTE') ||
        //         this.role.includes('ROLE_COMITE')) &&
        //     this.isDocenteCreated == true &&
        //     this.isComiteCreated == true &&
        //     this.isCoordinadorFase1Created == false
        // ) {
        //     this.isLoading = false;
        //     this.messageService.add(
        //         warnMessage(Aviso.CAMPOS_COORDINADOR_PENDIENTE)
        //     );
        // }
    }

    createSustentacion(): void {
        this.isLoading = true;
        // const formValue = { ...this.sustentacionForm.value };
        // formValue.respuestaSustentacion =
        //     formValue.respuestaSustentacion === 'Aprobado' ? 1 : 0;
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

    // onFileSelectThird(event: any) {
    //     this.FileEstudioHVA = this.uploadFileAndSetValue('linkEstudioHojaVidaAcademica', event);
    // }

    onFileSelectFourth(event: any) {
        this.FileFormatoH = this.uploadFileAndSetValue('linkFormatoH', event);
    }

    onFileSelectFifth(event: any) {
        this.FileFormatoI = this.uploadFileAndSetValue('linkFormatoI', event);
    }

    onFileSelectSixth(event: any) {
        this.FileActaSustentacionP = this.uploadFileAndSetValue('linkActaSustentacionPublica', event);
    }

    onFileSelectSeventh(event: any) {
        this.FileEstudioHVAGrado = this.uploadFileAndSetValue('linkEstudioHojaVidaAcademicaGrado', event);
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
    
        // if (field == 'linkEstudioHojaVidaAcademica') {
        //     this.FileEstudioHVA = null;
        //     this.EstudioHVA.clear();
        //     this.sustentacionForm.get('linkEstudioHojaVidaAcademica').reset();
        // }
    
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
            this.sustentacionForm.get('linkEstudioHojaVidaAcademicaGrado').reset();
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
                this.messageService.add(errorMessage(Aviso.ARCHIVO_DEMASIADO_GRANDE))
                return null
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
