import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backendGestionTrabajoDeGrado } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Sustentacion } from '../models/sustentacion';

@Injectable({
    providedIn: 'root',
})
export class SustentacionService {
    constructor(private http: HttpClient) {}

    createSustentacion(sustentacion: Sustentacion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado('sustentacion_proyecto_investigacion'),
            sustentacion,
            {
                headers: getHeaders(),
            }
        );
    }

    updateSustentacion(sustentacion: Sustentacion, sustentacionId: number) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `sustentacion_proyecto_investigacion/${sustentacionId}`
            ),
            sustentacion,
            {
                headers: getHeaders(),
            }
        );
    }

    getSustentacionByTrabajo(
        trabajoDeGradoId: number
    ): Observable<Sustentacion> {
        return this.http.get<Sustentacion>(
            backendGestionTrabajoDeGrado(
                `sustentacion_proyecto_investigacion/${trabajoDeGradoId}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }
}
