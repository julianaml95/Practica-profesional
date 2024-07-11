import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EstadoProceso } from 'src/app/core/enums/enums';
import { Solicitud } from '../../models/solicitud';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { SolicitudService } from '../../services/solicitud.service';
import { EstudianteService } from 'src/app/shared/services/estudiante.service';
import { TrabajoDeGradoService } from '../../services/trabajoDeGrado.service';
import { RespuestaService } from '../../services/respuesta.service';
import { ResolucionService } from '../../services/resolucion.service';
import { SustentacionService } from '../../services/sustentacion.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { Subscription, catchError, of } from 'rxjs';
import { BuscadorEstudiantesComponent } from 'src/app/shared/components/buscador-estudiantes/buscador-estudiantes.component';
import { DialogService } from 'primeng/dynamicdialog';
import { LocalStorageService } from 'src/app/shared/services/localstorage.service';

@Component({
    selector: 'app-bandeja-examen-de-valoracion',
    templateUrl: './bandeja-examen-de-valoracion.component.html',
    styleUrls: ['./bandeja-examen-de-valoracion.component.scss'],
})
export class BandejaExamenDeValoracionComponent implements OnInit {
    estudiante: Estudiante;
    estudianteSeleccionado: Estudiante;

    loading: boolean;

    estados: any[] = Object.keys(EstadoProceso).map((value, index) => ({
        index,
        text: value
            .split('_')
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' '),
    }));
    selectedEstados: number[] = this.estados.map((estado) => estado.index);
    solicitudesPorEstado: Solicitud[] | any[] = [];
    solicitudesPorEstudiante: Solicitud[] | any[] = [];
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
        private localStorageService: LocalStorageService,
        private dialogService: DialogService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.initializeComponent();
    }

    async initializeComponent() {
        this.role = this.authService.getRole();
        const isCoordinatorOrCommittee =
            this.role.includes('ROLE_COORDINADOR') ||
            this.role.includes('ROLE_COMITE');
        const isDocenteOrEstudiante =
            this.role.includes('ROLE_DOCENTE') ||
            this.role.includes('ROLE_ESTUDIANTE');

        if (isCoordinatorOrCommittee) {
            await this.listTrabajosDeGradoPorEstados(this.selectedEstados);
            this.selectedEstados = [...this.estados];
            this.cdr.detectChanges();
        }

        if (isDocenteOrEstudiante) {
            const estudiante = this.localStorageService.getLocalStorage('est');
            if (estudiante) {
                this.trabajoDeGradoService.setEstudianteSeleccionado(
                    estudiante
                );
                this.estudianteSeleccionado = estudiante;
                await this.listTrabajosDeGradoPorEstudiante(
                    this.estudianteSeleccionado.id
                );
            }
        }
    }

    onStateChange(event: any): void {
        const selectedIndices = event.value.map((estado: any) => estado.index);
        this.listTrabajosDeGradoPorEstados(selectedIndices);
    }

    listTrabajosDeGradoPorEstudiante(estudianteId: number) {
        return new Promise<void>((resolve, reject) => {
            this.loading = true;
            this.trabajoDeGradoSubscription = this.trabajoDeGradoService
                .listTrabajosDeGradoPorEstudiante(estudianteId)
                .subscribe({
                    next: (response) => {
                        if (response) {
                            this.solicitudesPorEstudiante =
                                response.trabajoGrado;
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
        });
    }

    listTrabajosDeGradoPorEstados(estados: number[]) {
        return new Promise<void>((resolve, reject) => {
            this.loading = true;
            this.trabajoDeGradoSubscription = this.trabajoDeGradoService
                .listTrabajosDeGradoPorEstado(estados.length ? estados : [0])
                .subscribe({
                    next: (response) => {
                        if (response) {
                            this.solicitudesPorEstado = response;
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
        });
    }

    onProcesoExamen() {
        this.router.navigate(['examen-de-valoracion/solicitud']);
    }

    onEditar(id: number, estudianteId: number) {
        this.unsubscribePreviousSubscriptions();

        if (estudianteId) {
            this.estudianteSubscription = this.estudianteService
                .getEstudiante(estudianteId)
                .pipe(
                    catchError(() => {
                        return of(null);
                    })
                )
                .subscribe((response) => {
                    if (response) {
                        this.estudiante = this.mapEstudianteLabel(response);
                        this.trabajoDeGradoService.setEstudianteSeleccionado(
                            this.estudiante
                        );
                    }
                });
        }

        this.trabajoDeGradoSubscription = this.trabajoDeGradoService
            .getTrabajoDeGrado(id)
            .pipe(
                catchError(() => {
                    return of(null);
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.trabajoDeGradoService.setTrabajoSeleccionado(response);
                }
            });

        this.solicitudSubscription = this.solicitudService
            .getSolicitudDocente(id)
            .pipe(
                catchError(() => {
                    return of(null);
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.trabajoDeGradoService.setSolicitudSeleccionada(
                        response
                    );
                }
            });

        this.respuestaSubscription = this.respuestaService
            .getRespuestasExamen(id)
            .pipe(
                catchError(() => {
                    return of(null);
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.trabajoDeGradoService.setRespuestaSeleccionada(
                        response
                    );
                }
            });

        this.resolucionSubscription = this.resolucionService
            .getResolucionDocente(id)
            .pipe(
                catchError(() => {
                    return of(null);
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.trabajoDeGradoService.setResolucionSeleccionada(
                        response
                    );
                }
            });

        this.sustentacionSubscription = this.sustentacionService
            .getSustentacionDocente(id)
            .pipe(
                catchError(() => {
                    return of(null);
                })
            )
            .subscribe((response) => {
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
            });

        if (!this.role.includes('ROLE_ESTUDIANTE')) {
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

    showBuscadorEstudiantes() {
        return this.dialogService.open(BuscadorEstudiantesComponent, {
            header: 'Seleccionar estudiante',
            width: '60%',
        });
    }

    limpiarEstudiante() {
        this.estudianteSeleccionado = null;
        this.localStorageService.clearLocalStorage('est');
        this.solicitudesPorEstudiante = [];
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
                    this.localStorageService.saveLocalStorage(
                        this.mapEstudianteLabel(response),
                        'est'
                    );
                    this.listTrabajosDeGradoPorEstudiante(
                        this.estudianteSeleccionado.id
                    );
                }
            },
        });
    }
}
