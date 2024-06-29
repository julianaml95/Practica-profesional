import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { PrincipalLoginComponent } from './pages/principal-login/principal-login.component';

const routes: Routes = [
    {
        path: '',
        component: PrincipalLoginComponent,
        children: [
            {
                path: '',
                component: LoginComponent,
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class LoginRoutingModule {}
