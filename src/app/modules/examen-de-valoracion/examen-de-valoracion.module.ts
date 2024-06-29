import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { SharedModule } from 'src/app/shared/shared.module';

import { PrimenNgModule } from '../primen-ng/primen-ng.module';
import { ExamenDeValoracionRoutingModule } from './examen-de-valoracion-routing.module';

import { PrincipalExamenDeValoracionComponent } from './pages/principal-examen-de-valoracion/principal-examen-de-valoracion.component';
import { BandejaExamenDeValoracionComponent } from './components/bandeja-examen/bandeja-examen-de-valoracion.component';
import { SolicitudExamenComponent } from './components/solicitud-examen/solicitud-examen.component';
import { RespuestaExamenComponent } from './components/respuesta-examen/respuesta-examen.component';
import { CustomFileUploadComponent } from './components/custom-file-upload/custom-file-upload.component';
import { ResolucionExamenComponent } from './components/resolucion-examen/resolucion-examen.component';
import { SustentacionExamenComponent } from './components/sustentacion-examen/sustentacion-examen.component';
import { DocumentoFormatoAComponent } from './components/documento-formatoA/documento-formatoA.component';
import { DocumentoFormatoBComponent } from './components/documento-formatoB/documento-formatoB.component';
import { DocumentoFormatoCComponent } from './components/documento-formatoC/documento-formatoC.component';
import { FileUploadValueAccessorDirective } from './components/respuesta-examen/fileupload-accessor-directive';

import { SolicitudService } from './services/solicitud.service';
import { TrabajoDeGradoService } from './services/trabajoDeGrado.service';
import { RespuestaService } from './services/respuesta.service';
import { ResolucionService } from './services/resolucion.service';
import { SustentacionService } from './services/sustentacion.service';

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
        FileUploadValueAccessorDirective,
    ],
    imports: [
        CommonModule,
        SharedModule,
        PrimenNgModule,
        ExamenDeValoracionRoutingModule,
        ReactiveFormsModule,
        PdfViewerModule,
    ],
    exports: [FileUploadValueAccessorDirective],
    providers: [
        TrabajoDeGradoService,
        SolicitudService,
        RespuestaService,
        ResolucionService,
        SustentacionService,
    ],
})
export class ExamenDeValoracionModule {}
