import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';

@Component({
    selector: 'app-proceso-examen',
    templateUrl: './proceso-examen.component.html',
    styleUrls: ['./proceso-examen.component.scss'],
})
export class ProcesoExamenComponent implements OnInit {
    constructor(
        private breadcrumbService: BreadcrumbService,
        private router: Router
    ) {}

    ngOnInit() {
        this.setBreadcrumb();
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([
            { label: 'Trabajos de Grado' },
            {
                label: 'Examen de Valoracion',
                routerLink: 'examen-de-valoracion',
            },
            { label: 'Proceso' },
        ]);
    }

    onSolicitudExamen() {
        this.router.navigate(['examen-de-valoracion/proceso/solicitud']);
    }
}
