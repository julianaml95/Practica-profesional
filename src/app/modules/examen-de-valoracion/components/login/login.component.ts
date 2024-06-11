import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { warnMessage } from 'src/app/core/utils/message-util';
import { Aviso } from 'src/app/core/enums/enums';

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
        private router: Router
    ) {}

    ngOnInit(): void {
        this.initForm();
    }

    initForm(): void {
        this.loginForm = this.fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
        });

        this.formReady.emit(this.loginForm);
    }

    onSubmit() {
        if (this.loginForm.valid) {
            const { username, password } = this.loginForm.value;
            this.authService.login(username, password).subscribe({
                next: (_) => {
                    this.router.navigate(['/']);
                },
                error: (_) => {
                    this.messageService.add(
                        warnMessage(Aviso.CREDENCIALES_INCORRECTAS)
                    );
                },
            });
        } else {
            console.log('Form is invalid');
        }
    }
}
