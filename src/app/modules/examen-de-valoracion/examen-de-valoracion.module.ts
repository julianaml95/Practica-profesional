import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExamenDeValoracionRoutingModule } from './examen-de-valoracion-routing.module';

import { PrimenNgModule } from '../primen-ng/primen-ng.module';

import { ReactiveFormsModule } from '@angular/forms';
import { PrincipalExamenDeValoracionComponent } from './pages/principal-examen-de-valoracion/principal-examen-de-valoracion.component';
import { SolicitudService } from './services/solicitud.service';
import { BandejaExamenDeValoracionComponent } from './components/bandeja-examen/bandeja-examen-de-valoracion.component';
import { SolicitudExamenComponent } from './components/solicitud-examen/solicitud-examen.component';
import { RespuestaExamenComponent } from './components/respuesta-examen/respuesta-examen.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { CustomFileUploadComponent } from './components/custom-file-upload/custom-file-upload.component';
import { ResolucionExamenComponent } from './components/resolucion-examen/resolucion-examen.component';
import { SustentacionExamenComponent } from './components/sustentacion-examen/sustentacion-examen.component';

import { DocumentoFormatoAComponent } from './components/documento-formatoA/documento-formatoA.component';
import { DocumentoFormatoBComponent } from './components/documento-formatoB/documento-formatoB.component';
import { DocumentoFormatoCComponent } from './components/documento-formatoC/documento-formatoC.component';

@NgModule({
    declarations: [
        PrincipalExamenDeValoracionComponent,
        BandejaExamenDeValoracionComponent,
        DocumentoFormatoAComponent,
        DocumentoFormatoBComponent,
        DocumentoFormatoCComponent,
        SolicitudExamenComponent,
        CustomFileUploadComponent,
        RespuestaExamenComponent,
        ResolucionExamenComponent,
        SustentacionExamenComponent,
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
