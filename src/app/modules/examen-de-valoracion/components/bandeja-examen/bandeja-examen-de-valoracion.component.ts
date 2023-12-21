import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';
import { SolicitudService } from '../../services/solicitud.service';

@Component({
    selector: 'app-bandeja-examen-de-valoracion',
    templateUrl: './bandeja-examen-de-valoracion.component.html',
    styleUrls: ['./bandeja-examen-de-valoracion.component.scss'],
})
export class BandejaExamenDeValoracionComponent implements OnInit {
    loading: boolean;
    solicitudes: any[] = [
        {
            id: 1,
            fecha: '2023-19-12',
            estado: 'ACTIVO',
            titulo: 'Solicitud 1',
            doc_solicitud_valoracion: 'archivo1.pdf',
            doc_anteproyecto_examen: 'archivo2.pdf',
            doc_examen_valoracion: 'archivo3.pdf',
            docente: 'Juan Pérez',
            experto: 'María Gómez',
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
            docente: 'Ana López',
            experto: 'Carlos Rodríguez',
            numero_acta: 'A002',
            fecha_acta: '2023-12-22',
            doc_oficio_jurados: 'oficio2.pdf',
            fecha_maxima_evaluacion: '2023-12-31',
        },
        {
            id: 3,
            fecha: '2023-19-12',
            estado: 'ACTIVO',
            titulo: 'Solicitud 3',
            doc_solicitud_valoracion: 'archivo7.pdf',
            doc_anteproyecto_examen: 'archivo8.pdf',
            doc_examen_valoracion: 'archivo9.pdf',
            docente: 'Pedro Ramírez',
            experto: 'Laura Martínez',
            numero_acta: 'A003',
            fecha_acta: '2023-12-23',
            doc_oficio_jurados: 'oficio3.pdf',
            fecha_maxima_evaluacion: '2023-12-31',
        },
        {
            id: 4,
            fecha: '2023-19-12',
            estado: 'ACTIVO',
            titulo: 'Solicitud 4',
            doc_solicitud_valoracion: 'archivo10.pdf',
            doc_anteproyecto_examen: 'archivo11.pdf',
            doc_examen_valoracion: 'archivo12.pdf',
            docente: 'Elena Gutiérrez',
            experto: 'José Martín',
            numero_acta: 'A004',
            fecha_acta: '2023-12-24',
            doc_oficio_jurados: 'oficio4.pdf',
            fecha_maxima_evaluacion: '2023-12-31',
        },
    ];

    constructor(
        private breadcrumbService: BreadcrumbService,
        private router: Router,
        private solicitudService: SolicitudService
    ) {}

    ngOnInit(): void {
        this.setBreadcrumb();
        this.listSolicitudes();
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            { label: 'Examen de Valoracion' },
        ]);
    }

    listSolicitudes() {
        this.loading = true;
        this.solicitudService
            .listSolicitudes()
            .subscribe({
                next: (response) =>
                    (this.solicitudes = response.filter(
                        (d) => d.estado === 'ACTIVO'
                    )),
            })
            .add(() => (this.loading = false));
    }

    onProcesoExamen() {
        this.router.navigate(['examen-de-valoracion/proceso']);
    }

    onEditar(id: number) {
        this.router.navigate(['examen-de-valoracion/editar', id]);
    }
}
