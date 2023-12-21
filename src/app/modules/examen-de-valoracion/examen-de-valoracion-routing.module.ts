import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BandejaExamenDeValoracionComponent } from './components/bandeja-examen/bandeja-examen-de-valoracion.component';
import { ProcesoExamenComponent } from './components/proceso-examen/proceso-examen.component';
import { SolicitudExamenComponent } from './components/soliticud-examen/solicitud-examen.component';
import { PrincipalExamenDeValoracionComponent } from './pages/principal-examen-de-valoracion/principal-examen-de-valoracion.component';

const routes: Routes = [
    {
        path: '',
        component: PrincipalExamenDeValoracionComponent,
        children: [
            {
                path: '',
                component: BandejaExamenDeValoracionComponent,
            },
            {
                path: 'proceso',
                component: ProcesoExamenComponent,
            },
            {
                path: 'proceso/solicitud',
                component: SolicitudExamenComponent,
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ExamenDeValoracionRoutingModule {}
