import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
    @Output() formReady = new EventEmitter<FormGroup>();

    loginForm: FormGroup;

    constructor(
        private fb: FormBuilder,
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
                next: (response) => {
                    console.log('Login successful', response);
                    this.router.navigate(['/']);
                },
                error: (error) => {
                    console.error('Login failed', error);
                },
            });
        } else {
            console.log('Form is invalid');
        }
    }
}
