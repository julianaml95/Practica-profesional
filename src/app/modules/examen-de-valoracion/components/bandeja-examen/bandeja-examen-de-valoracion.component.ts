import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { SolicitudService } from '../../services/solicitud.service';
import { BuscadorEstudiantesComponent } from 'src/app/shared/components/buscador-estudiantes/buscador-estudiantes.component';
import { DialogService } from 'primeng/dynamicdialog';
import { Estudiante } from 'src/app/modules/gestion-estudiantes/models/estudiante';
import { ConfirmationService, MessageService, PrimeIcons } from 'primeng/api';
import { Mensaje } from 'src/app/core/enums/enums';
import { errorMessage } from 'src/app/core/utils/message-util';
import { Solicitud } from '../../models/solicitud';
import { RespuestaService } from '../../services/respuesta.service';
import { LocalStorageService } from '../../services/localstorage.service';
import { ResolucionService } from '../../services/resolucion.service';

@Component({
    selector: 'app-bandeja-examen-de-valoracion',
    templateUrl: './bandeja-examen-de-valoracion.component.html',
    styleUrls: ['./bandeja-examen-de-valoracion.component.scss'],
})
export class BandejaExamenDeValoracionComponent implements OnInit {
    loading: boolean;
    estudianteSeleccionado: Estudiante;
    solicitudes: Solicitud[] = [
        {
            id: 1,
            fecha: '2023-19-12',
            estado: 'ACTIVO',
            titulo: 'Solicitud 1',
            doc_solicitud_valoracion: 'archivo1.pdf',
            doc_anteproyecto_examen: 'archivo2.pdf',
            doc_examen_valoracion: 'archivo3.pdf',
            numero_acta: 'A001',
            fecha_acta: '2023-12-20',
            doc_oficio_jurados: 'oficio.pdf',
            fecha_maxima_evaluacion: '2023-12-31',
        },
        {
            id: 2,
            fecha: '2023-19-12',
            estado: 'ACTIVO',
            titulo: 'Solicitud 2',
            doc_solicitud_valoracion: 'archivo4.pdf',
            doc_anteproyecto_examen: 'archivo5.pdf',
            doc_examen_valoracion: 'archivo6.pdf',
            numero_acta: 'A002',
            fecha_acta: '2023-12-22',
            doc_oficio_jurados: 'oficio2.pdf',
            fecha_maxima_evaluacion: '2023-12-31',
        },
    ];

    constructor(
        private breadcrumbService: BreadcrumbService,
        private router: Router,
        private solicitudService: SolicitudService,
        private respuestaService: RespuestaService,
        private resolucionService: ResolucionService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private localStorageService: LocalStorageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.loadData();
        this.setBreadcrumb();
    }

    loadData() {
        const estudiante = this.localStorageService.getLocalStorage('est');
        if (estudiante) {
            this.solicitudService.setEstudianteSeleccionado(estudiante);
            this.estudianteSeleccionado = estudiante;
            this.listSolicitudes(estudiante.id);
        }
    }

    listSolicitudes(id: number) {
        this.loading = true;
        this.solicitudService
            .listSolicitudes(id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.solicitudes = response.filter(
                            (d) =>
                                d.estudiante == this.estudianteSeleccionado.id
                        );
                    }
                },
            })
            .add(() => (this.loading = false));
        this.solicitudService.setResolucionSeleccionada(null);
        this.solicitudService.setRespuestaSeleccionada(null);
        this.solicitudService.setSolicitudSeleccionada(null);
        this.solicitudService.setTituloSeleccionadoSubject(null);
    }

    onProcesoExamen() {
        this.router.navigate(['examen-de-valoracion/solicitud']);
    }

    onEditar(id: number) {
        this.solicitudService.getSolicitud(id).subscribe({
            next: (response) => {
                this.solicitudService.setSolicitudSeleccionada(response);
            },
        });
        this.respuestaService.getRespuestaBySolicitud(id).subscribe({
            next: (response) => {
                this.solicitudService.setRespuestaSeleccionada(response);
            },
        });
        this.resolucionService.getResolucionBySolicitud(id).subscribe({
            next: (response) => {
                this.solicitudService.setResolucionSeleccionada(response);
            },
        });
        this.router.navigate(['examen-de-valoracion/solicitud/editar', id]);
    }

    deleteSolicitud(id: number) {
        this.solicitudService.deleteSolicitud(id).subscribe({
            next: () =>
                this.messageService.add(
                    errorMessage(Mensaje.SOLICITUD_ELIMINADA_CORRECTAMENTE)
                ),
            error: (e) => console.log(e),
            complete: () => {
                this.respuestaService.deleteRespuesta(id).subscribe({
                    error: (e) => console.log(e),
                });
                this.resolucionService.deleteResolucion(id).subscribe({
                    error: (e) => console.log(e),
                });
                this.listSolicitudes(this.estudianteSeleccionado.id);
            },
        });
    }

    onDelete(event: any, id: number) {
        this.confirmationService.confirm({
            target: event.target,
            message: Mensaje.CONFIRMAR_ELIMINAR_REGISTRO,
            icon: PrimeIcons.EXCLAMATION_TRIANGLE,
            acceptLabel: 'Si, eliminar',
            rejectLabel: 'No',
            accept: () => this.deleteSolicitud(id),
        });
    }

    showBuscadorEstudiantes() {
        return this.dialogService.open(BuscadorEstudiantesComponent, {
            header: 'Seleccionar estudiante',
            width: '60%',
        });
    }

    mapEstudianteLabel(estudiante: Estudiante) {
        return {
            id: estudiante.id,
            codigo: estudiante.codigo,
            nombre: estudiante.persona.nombre,
            apellido: estudiante.persona.apellido,
            identificacion: estudiante.persona.identificacion,
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
                    this.solicitudService.setEstudianteSeleccionado(
                        this.mapEstudianteLabel(response)
                    );
                    this.listSolicitudes(this.estudianteSeleccionado.id);
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
