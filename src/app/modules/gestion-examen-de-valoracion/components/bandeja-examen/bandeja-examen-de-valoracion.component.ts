import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService, PrimeIcons } from 'primeng/api';
import { Aviso, EstadoProceso } from 'src/app/core/enums/enums';
import { errorMessage } from 'src/app/core/utils/message-util';
import { Solicitud } from '../../models/solicitud';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { EstudianteService } from 'src/app/shared/services/estudiante.service';
import { TrabajoDeGradoService } from '../../services/trabajoDeGrado.service';
import { RespuestaService } from '../../services/respuesta.service';
import { ResolucionService } from '../../services/resolucion.service';
import { SustentacionService } from '../../services/sustentacion.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-bandeja-examen-de-valoracion',
    templateUrl: './bandeja-examen-de-valoracion.component.html',
    styleUrls: ['./bandeja-examen-de-valoracion.component.scss'],
})
export class BandejaExamenDeValoracionComponent implements OnInit {
    estudiante: Estudiante;

    loading: boolean;

    estados: any[] = Object.keys(EstadoProceso).map((value, index) => ({
        index,
        text: value
            .split('_')
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' '),
    }));
    selectedEstados: number[] = this.estados.map((estado) => estado.index);
    solicitudes: Solicitud[] | any[] = [];
    role: string[];

    private estudianteSubscription: Subscription;
    private trabajoDeGradoSubscription: Subscription;
    private solicitudSubscription: Subscription;
    private respuestaSubscription: Subscription;
    private resolucionSubscription: Subscription;
    private sustentacionSubscription: Subscription;

    constructor(
        private cdr: ChangeDetectorRef,
        private router: Router,
        private estudianteService: EstudianteService,
        private trabajoDeGradoService: TrabajoDeGradoService,
        private solicitudService: SolicitudService,
        private respuestaService: RespuestaService,
        private resolucionService: ResolucionService,
        private sustentacionService: SustentacionService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.role = this.authService.getRole();
        this.listTrabajosDeGrado(this.selectedEstados);
        this.selectedEstados = [...this.estados];
        this.cdr.detectChanges();
    }

    onStateChange(event: any): void {
        const selectedIndices = event.value.map((estado: any) => estado.index);
        this.listTrabajosDeGrado(selectedIndices);
    }

    listTrabajosDeGrado(estados: number[]) {
        return new Promise<void>((resolve, reject) => {
            this.loading = true;
            this.trabajoDeGradoSubscription = this.trabajoDeGradoService
                .listTrabajosDeGradoPorEstado(estados.length ? estados : [0])
                .subscribe({
                    next: async (response) => {
                        if (response) {
                            this.solicitudes = response;
                            resolve();
                        }
                    },
                    error: (e) => {
                        console.error(e);
                    },
                    complete: () => {
                        this.loading = false;
                    },
                });

            this.trabajoDeGradoService.setEstudianteSeleccionado(null);
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

    onEditar(id: number, estudianteId: number) {
        this.unsubscribePreviousSubscriptions();
        this.estudianteSubscription = this.estudianteService
            .getEstudiante(estudianteId)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.estudiante = this.mapEstudianteLabel(response);
                        this.trabajoDeGradoService.setEstudianteSeleccionado(
                            this.estudiante
                        );
                    }
                },
            });
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
        if (this.estudianteSubscription) {
            this.estudianteSubscription.unsubscribe();
        }
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
                this.listTrabajosDeGrado(
                    this.estados.map((estado) => estado.index)
                );
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
}
