import { Component, OnInit } from '@angular/core';
import { AppMainComponent } from '../main/app.main.component';
import { MenuItem } from 'primeng/api';
import { menuItems } from '../../constants/menu-items';
import { AuthService } from 'src/app/modules/examen-de-valoracion/services/auth.service';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html',
})
export class AppTopBarComponent implements OnInit {
    items: MenuItem[];
    isLoggedIn: boolean = false;
    username: string = '';
    role: string = '';

    constructor(
        public appMain: AppMainComponent,
        private authService: AuthService
    ) {
        this.items = menuItems;
    }

    ngOnInit(): void {
        this.authService.isLoggedIn().subscribe((status) => {
            this.isLoggedIn = status;
        });

        this.authService.getUsername().subscribe((name) => {
            this.username = name;
        });

        this.authService.role$.subscribe((roles) => {
            if (roles.length > 0) {
                this.role = roles[0]; // Assuming the user has a single role, adjust if necessary
            } else {
                this.role = '';
            }
        });
    }

    logout() {
        this.authService.logout();
    }
}
