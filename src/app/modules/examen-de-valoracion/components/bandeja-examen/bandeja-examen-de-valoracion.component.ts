import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService, PrimeIcons } from 'primeng/api';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { DialogService } from 'primeng/dynamicdialog';
import { Aviso, EstadoProceso } from 'src/app/core/enums/enums';
import { errorMessage } from 'src/app/core/utils/message-util';
import { Solicitud } from '../../models/solicitud';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { LocalStorageService } from '../../../../shared/services/localstorage.service';
import { ResolucionService } from '../../services/resolucion.service';
import { SustentacionService } from '../../services/sustentacion.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { RespuestaService } from '../../services/respuesta.service';
import { TrabajoDeGradoService } from '../../services/trabajoDeGrado.service';
import { BuscadorEstudiantesComponent } from 'src/app/shared/components/buscador-estudiantes/buscador-estudiantes.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-bandeja-examen-de-valoracion',
    templateUrl: './bandeja-examen-de-valoracion.component.html',
    styleUrls: ['./bandeja-examen-de-valoracion.component.scss'],
})
export class BandejaExamenDeValoracionComponent implements OnInit {
    loading: boolean;
    estudianteSeleccionado: Estudiante;
    estadoInicial: string =
        EstadoProceso.SIN_REGISTRAR_SOLICITUD_EXAMEN_DE_VALORACION;
    estadoEstudiante: string =
        EstadoProceso.PENDIENTE_SUBIDA_ARCHIVOS_ESTUDIANTE_SUSTENTACION;
    solicitudes: Solicitud[] | any[] = [];
    role: string[];
    estadosFinalizado: string[] = [
        EstadoProceso.SIN_REGISTRAR_SOLICITUD_EXAMEN_DE_VALORACION,
        EstadoProceso.SUSTENTACION_APROBADA,
        EstadoProceso.SUSTENTACION_NO_APROBADA,
    ];
    private trabajoDeGradoSubscription: Subscription;
    private solicitudSubscription: Subscription;
    private respuestaSubscription: Subscription;
    private resolucionSubscription: Subscription;
    private sustentacionSubscription: Subscription;

    constructor(
        private breadcrumbService: BreadcrumbService,
        private router: Router,
        private trabajoDeGradoService: TrabajoDeGradoService,
        private solicitudService: SolicitudService,
        private respuestaService: RespuestaService,
        private resolucionService: ResolucionService,
        private sustentacionService: SustentacionService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private localStorageService: LocalStorageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.role = this.authService.getRole();
        this.setBreadcrumb();
        this.loadData();
    }

    async loadData() {
        const estudiante = this.localStorageService.getLocalStorage('est');
        if (estudiante) {
            this.trabajoDeGradoService.setEstudianteSeleccionado(estudiante);
            this.estudianteSeleccionado = estudiante;
            await this.listTrabajosDeGrado(estudiante.id);
        }
    }

    listTrabajosDeGrado(id: number) {
        return new Promise<void>((resolve, reject) => {
            this.loading = true;

            this.trabajoDeGradoSubscription = this.trabajoDeGradoService
                .listTrabajosDeGrado(id)
                .subscribe({
                    next: async (response) => {
                        if (
                            response &&
                            response.trabajoGrado &&
                            response.trabajoGrado.length > 0
                        ) {
                            const primerTrabajoConEstado =
                                response.trabajoGrado.find((tg) => tg.estado);
                            if (primerTrabajoConEstado) {
                                this.estadoInicial =
                                    primerTrabajoConEstado.estado;
                            } else {
                                this.estadoInicial =
                                    EstadoProceso.SIN_REGISTRAR_SOLICITUD_EXAMEN_DE_VALORACION;
                            }
                        } else {
                            this.estadoInicial =
                                EstadoProceso.SIN_REGISTRAR_SOLICITUD_EXAMEN_DE_VALORACION;
                        }
                        this.solicitudes = response.trabajoGrado || [];
                        resolve();
                    },
                    error: (e) => {
                        console.error(e);
                    },
                    complete: () => {
                        this.loading = false;
                    },
                });

            this.trabajoDeGradoService.setSustentacionValid(null);
            this.trabajoDeGradoService.setResolucionValid(null);
            this.trabajoDeGradoService.setRespuestaValid(null);
            this.trabajoDeGradoService.setSustentacionSeleccionada(null);
            this.trabajoDeGradoService.setResolucionSeleccionada(null);
            this.trabajoDeGradoService.setRespuestaSeleccionada(null);
            this.trabajoDeGradoService.setSolicitudSeleccionada(null);
            this.trabajoDeGradoService.setTituloSeleccionadoSubject(null);
            this.trabajoDeGradoService.setTrabajoSeleccionado(null);
        });
    }

    onProcesoExamen() {
        this.router.navigate(['examen-de-valoracion/solicitud']);
    }

    onEditar(id: number) {
        this.unsubscribePreviousSubscriptions();
        this.trabajoDeGradoSubscription = this.trabajoDeGradoService
            .getTrabajoDeGrado(id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.trabajoDeGradoService.setTrabajoSeleccionado(
                            response
                        );
                    }
                },
            });
        this.solicitudSubscription = this.solicitudService
            .getSolicitudDocente(id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.trabajoDeGradoService.setSolicitudSeleccionada(
                            response
                        );
                    }
                },
            });
        this.respuestaSubscription = this.respuestaService
            .getRespuestasExamen(id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.trabajoDeGradoService.setRespuestaSeleccionada(
                            response
                        );
                    }
                },
            });
        this.resolucionSubscription = this.resolucionService
            .getResolucionDocente(id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.trabajoDeGradoService.setResolucionSeleccionada(
                            response
                        );
                    }
                },
            });
        this.sustentacionSubscription = this.sustentacionService
            .getSustentacionDocente(id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.trabajoDeGradoService.setSustentacionSeleccionada(
                            response
                        );
                        if (this.role.includes('ROLE_ESTUDIANTE')) {
                            this.router.navigate([
                                'examen-de-valoracion/sustentacion/editar',
                                id,
                            ]);
                        }
                    }
                },
            });
        if (
            this.role.includes('ROLE_DOCENTE') ||
            this.role.includes('ROLE_COORDINADOR')
        ) {
            this.router.navigate(['examen-de-valoracion/solicitud/editar', id]);
        }
    }

    private unsubscribePreviousSubscriptions() {
        if (this.trabajoDeGradoSubscription) {
            this.trabajoDeGradoSubscription.unsubscribe();
        }
        if (this.solicitudSubscription) {
            this.solicitudSubscription.unsubscribe();
        }
        if (this.respuestaSubscription) {
            this.respuestaSubscription.unsubscribe();
        }
        if (this.resolucionSubscription) {
            this.resolucionSubscription.unsubscribe();
        }
        if (this.sustentacionSubscription) {
            this.sustentacionSubscription.unsubscribe();
        }
    }

    deleteTrabajoDeGrado(id: number) {
        this.trabajoDeGradoService.deleteTrabajoDeGrado(id).subscribe({
            next: () => {
                this.messageService.add(
                    errorMessage(Aviso.SOLICITUD_ELIMINADA_CORRECTAMENTE)
                );
            },
            error: (e) => console.error(e),
            complete: () => {
                this.listTrabajosDeGrado(this.estudianteSeleccionado.id);
            },
        });
    }

    onDelete(event: any, id: number) {
        this.confirmationService.confirm({
            target: event.target,
            message: Aviso.CONFIRMAR_ELIMINAR_REGISTRO,
            icon: PrimeIcons.EXCLAMATION_TRIANGLE,
            acceptLabel: 'Si, eliminar',
            rejectLabel: 'No',
            accept: () => this.deleteTrabajoDeGrado(id),
        });
    }

    showBuscadorEstudiantes() {
        return this.dialogService.open(BuscadorEstudiantesComponent, {
            header: 'Seleccionar estudiante',
            width: '60%',
        });
    }

    mapEstudianteLabel(estudiante: any) {
        return {
            id: estudiante.id,
            nombre: estudiante.nombre,
            codigo: estudiante.codigo,
            apellido: estudiante.apellido,
            identificacion: estudiante.identificacion,
            tipoIdentificacion: estudiante.tipoIdentificacion,
        };
    }

    limpiarEstudiante() {
        this.estudianteSeleccionado = null;
        this.localStorageService.clearLocalStorage('est');
    }

    onSeleccionarEstudiante() {
        const ref = this.showBuscadorEstudiantes();
        ref.onClose.subscribe({
            next: (response) => {
                if (response) {
                    this.estudianteSeleccionado =
                        this.mapEstudianteLabel(response);
                    this.trabajoDeGradoService.setEstudianteSeleccionado(
                        this.estudianteSeleccionado
                    );
                    this.listTrabajosDeGrado(this.estudianteSeleccionado.id);
                    this.localStorageService.saveLocalStorage(
                        this.mapEstudianteLabel(response),
                        'est'
                    );
                }
            },
        });
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            { label: 'Examen de Valoracion' },
        ]);
    }
}
