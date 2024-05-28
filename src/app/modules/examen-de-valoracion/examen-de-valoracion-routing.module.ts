import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BandejaExamenDeValoracionComponent } from './components/bandeja-examen/bandeja-examen-de-valoracion.component';
import { SolicitudExamenComponent } from './components/solicitud-examen/solicitud-examen.component';
import { PrincipalExamenDeValoracionComponent } from './pages/principal-examen-de-valoracion/principal-examen-de-valoracion.component';
import { CrearSolicitudExamenComponent } from './components/crear-solicitud-examen/crear-solicitud-examen.component';
import { RespuestaExamenComponent } from './components/respuesta-examen/respuesta-examen.component';
import { ResolucionExamenComponent } from './components/resolucion-examen/resolucion-examen.component';
import { SustentacionExamenComponent } from './components/sustentacion-examen/sustentacion-examen.component';
import { RoleGuard } from 'src/app/core/guards/role/role-guard';

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
                path: 'solicitud',
                component: SolicitudExamenComponent,
                canActivate: [RoleGuard],
                data: { roles: ['ROLE_DOCENTE'] },
            },
            {
                path: 'solicitud/editar/:id',
                component: SolicitudExamenComponent,
                canActivate: [RoleGuard],
                data: {
                    roles: ['ROLE_COORDINADOR', 'ROLE_DOCENTE', 'ROLE_COMITE'],
                },
            },
            {
                path: 'solicitud/crear',
                component: CrearSolicitudExamenComponent,
            },
            {
                path: 'respuesta',
                component: RespuestaExamenComponent,
                canActivate: [RoleGuard],
                data: { roles: ['ROLE_COORDINADOR'] },
            },
            {
                path: 'respuesta/editar/:id',
                component: RespuestaExamenComponent,
                canActivate: [RoleGuard],
                data: { roles: ['ROLE_COORDINADOR'] },
            },
            {
                path: 'resolucion',
                component: ResolucionExamenComponent,
                canActivate: [RoleGuard],
                data: { roles: ['ROLE_COORDINADOR', 'ROLE_COMITE'] },
            },
            {
                path: 'resolucion/editar/:id',
                component: ResolucionExamenComponent,
                canActivate: [RoleGuard],
                data: { roles: ['ROLE_COORDINADOR', 'ROLE_COMITE'] },
            },
            {
                path: 'sustentacion',
                component: SustentacionExamenComponent,
                canActivate: [RoleGuard],
                data: {
                    roles: ['ROLE_COORDINADOR', 'ROLE_DOCENTE', 'ROLE_COMITE'],
                },
            },
            {
                path: 'sustentacion/editar/:id',
                component: SustentacionExamenComponent,
                canActivate: [RoleGuard],
                data: {
                    roles: ['ROLE_COORDINADOR', 'ROLE_DOCENTE', 'ROLE_COMITE'],
                },
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ExamenDeValoracionRoutingModule {}
