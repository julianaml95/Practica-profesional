import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExamenDeValoracionRoutingModule } from './examen-de-valoracion-routing.module';
import { SharedModule } from 'primeng/api';
import { PrimenNgModule } from '../primen-ng/primen-ng.module';

import { ReactiveFormsModule } from '@angular/forms';
import { PrincipalExamenDeValoracionComponent } from './pages/principal-examen-de-valoracion/principal-examen-de-valoracion.component';
import { BandejaExamenDeValoracionComponent } from './components/bandeja-examen/bandeja-examen-de-valoracion.component';
import { SolicitudService } from './services/solicitud.service';
import { CrearSolicitudExamenComponent } from './components/crear-solicitud-examen/crear-solicitud-examen.component';
import { SolicitudExamenComponent } from './components/solicitud-examen/solicitud-examen.component';

@NgModule({
    declarations: [
        PrincipalExamenDeValoracionComponent,
        BandejaExamenDeValoracionComponent,
        CrearSolicitudExamenComponent,
        SolicitudExamenComponent
    ],
    imports: [
        CommonModule,
        SharedModule,
        PrimenNgModule,
        ExamenDeValoracionRoutingModule,
        ReactiveFormsModule,
    ],
    providers: [SolicitudService],
})
export class ExamenDeValoracionModule {}
