import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../shared/services/auth.service';
import { Router } from '@angular/router';
import { errorMessage, warnMessage } from 'src/app/core/utils/message-util';
import { Aviso, Mensaje } from 'src/app/core/enums/enums';
import { MessageService } from 'primeng/api';
import { BreadcrumbService } from 'src/app/core/components/breadcrumb/app.breadcrumb.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();

    loginForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private authService: AuthService,
        private router: Router,
        private breadcrumbService: BreadcrumbService
    ) {}

    ngOnInit() {
        this.setBreadcrumb();
        this.initForm();
    }

    initForm() {
        this.loginForm = this.fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });

        this.formReady.emit(this.loginForm);
    }

    onLogin() {
        if (this.loginForm.invalid) {
            this.messageService.add(
                warnMessage(Mensaje.REGISTRE_CAMPOS_OBLIGATORIOS)
            );
            return;
        }

        const { username, password } = this.loginForm.value;
        this.authService.login(username, password).subscribe({
            next: () => {
                this.router.navigate(['/']);
            },
            error: () => {
                this.messageService.add(
                    errorMessage(Aviso.CREDENCIALES_INCORRECTAS)
                );
            },
        });
    }

    setBreadcrumb() {
        this.breadcrumbService.setItems([{ label: 'Inicio', routerLink: '/' }]);
    }
}
