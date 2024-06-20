import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { SolicitudService } from '../../services/solicitud.service';
import { BuscadorEstudiantesComponent } from 'src/app/shared/components/buscador-estudiantes/buscador-estudiantes.component';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService, PrimeIcons } from 'primeng/api';
import { Aviso } from 'src/app/core/enums/enums';
import { errorMessage } from 'src/app/core/utils/message-util';
import { Solicitud } from '../../models/solicitud';
import { LocalStorageService } from '../../services/localstorage.service';
import { ResolucionService } from '../../services/resolucion.service';
import { SustentacionService } from '../../services/sustentacion.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-bandeja-examen-de-valoracion',
    templateUrl: './bandeja-examen-de-valoracion.component.html',
    styleUrls: ['./bandeja-examen-de-valoracion.component.scss'],
})
export class BandejaExamenDeValoracionComponent implements OnInit {
    loading: boolean;
    estudianteSeleccionado: any;
    solicitudes: Solicitud[] = [];
    role: string[];

    constructor(
        private breadcrumbService: BreadcrumbService,
        private router: Router,
        private solicitudService: SolicitudService,
        private resolucionService: ResolucionService,
        private sustentacionService: SustentacionService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private localStorageService: LocalStorageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        this.loadData();
        this.setBreadcrumb();
    }

    loadData() {
        const estudiante = this.localStorageService.getLocalStorage('est');
        this.role = this.authService.getRole();

        if (estudiante) {
            this.solicitudService.setEstudianteSeleccionado(estudiante);
            this.estudianteSeleccionado = estudiante;
            this.listTrabajosDeGrado(estudiante.id);
        }
    }

    listTrabajosDeGrado(id: number) {
        this.loading = true;
        this.solicitudService
            .listTrabajosDeGrado(id)
            .subscribe({
                next: (response) => {
                    if (response) {
                        this.solicitudes = response.trabajoGrado;
                    }
                },
                error: (e) => console.error(e),
            })
            .add(() => (this.loading = false));
        this.solicitudService.setSustentacionSeleccionada(null);
        this.solicitudService.setResolucionSeleccionada(null);
        this.solicitudService.setRespuestaSeleccionada(null);
        this.solicitudService.setSolicitudSeleccionada(null);
        this.solicitudService.setTituloSeleccionadoSubject(null);
        this.solicitudService.setTrabajoSeleccionado(null);
    }

    onProcesoExamen() {
        this.router.navigate(['examen-de-valoracion/solicitud']);
    }

    onEditar(id: number) {
        this.solicitudService.getTrabajoDeGrado(id).subscribe({
            next: (response) => {
                this.solicitudService.setTrabajoSeleccionado(response);
            },
        });
        this.solicitudService.getSolicitudDocente(id).subscribe({
            next: (response) => {
                this.solicitudService.setSolicitudSeleccionada(response);
            },
        });
        this.resolucionService.getResolucionDocente(id).subscribe({
            next: (response) => {
                this.solicitudService.setResolucionSeleccionada(response);
            },
        });
        this.sustentacionService.getSustentacionDocente(id).subscribe({
            next: (response) => {
                this.solicitudService.setSustentacionSeleccionada(response);
            },
        });
        this.router.navigate(['examen-de-valoracion/solicitud/editar', id]);
    }

    deleteTrabajoDeGrado(id: number) {
        this.solicitudService.deleteTrabajoDeGrado(id).subscribe({
            next: () =>
                this.messageService.add(
                    errorMessage(Aviso.SOLICITUD_ELIMINADA_CORRECTAMENTE)
                ),
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
                    this.solicitudService.setEstudianteSeleccionado(
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
