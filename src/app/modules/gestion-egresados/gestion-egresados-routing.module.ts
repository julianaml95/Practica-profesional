import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrincipalSeguimientoEgresados } from './pages/principal-seguimiento-a-egresados.component';
import { BandejaSeguimientoAEgresadosComponent } from './components/bandeja-egresados/bandeja-seguimiento-a-egresados.component';
import { RoleGuard } from 'src/app/core/guards/role/role-guard';

const routes: Routes = [
    {
        path: '',
        component: PrincipalSeguimientoEgresados,
        children: [
            {
                path: '',
                component: BandejaSeguimientoAEgresadosComponent,
                canActivate: [RoleGuard],
                data: {
                    roles: ['ROLE_ESTUDIANTE', 'ROLE_COORDINADOR'],
                },
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SeguimientoAEgresadosRoutingModule {}
