import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';

import { PrimenNgModule } from '../primen-ng/primen-ng.module';

import { LoginComponent } from './components/login/login.component';
import { PrincipalLoginComponent } from './pages/principal-login/principal-login.component';
import { LoginRoutingModule } from './gestion-acceso-routing.module';

@NgModule({
    declarations: [PrincipalLoginComponent, LoginComponent],
    imports: [
        CommonModule,
        SharedModule,
        LoginRoutingModule,
        PrimenNgModule,
        ReactiveFormsModule,
    ],
    providers: [],
})
export class LoginModule {}
