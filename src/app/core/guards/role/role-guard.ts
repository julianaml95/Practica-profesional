import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    Router,
} from '@angular/router';
import { AuthService } from 'src/app/modules/examen-de-valoracion/services/auth.service';

@Injectable({
    providedIn: 'root',
})
export class RoleGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean {
        const expectedRoles = route.data['roles'];
        const userRoles = this.authService.getRole();

        // Check if the user has any of the expected roles
        if (!expectedRoles.some((role) => userRoles.includes(role))) {
            this.router.navigate(['/pages/access']);
            return false;
        }
        return true;
    }
}
