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

    createSustentacionCoordinador(sustentacion: Sustentacion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'sustentacion_proyecto_investigacion/insertarInformacionCoordinador'
            ),
            sustentacion,
            {
                headers: getHeaders(),
            }
        );
    }

    createSustentacionComite(sustentacion: Sustentacion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'sustentacion_proyecto_investigacion/insertarInformacionComite'
            ),
            sustentacion,
            {
                headers: getHeaders(),
            }
        );
    }

    createSustentacionDocente(sustentacion: Sustentacion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'sustentacion_proyecto_investigacion/insertarInformacionDocente'
            ),
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

    getSustentacionCoordinador(
        trabajoDeGradoId: number
    ): Observable<Sustentacion> {
        return this.http.get<Sustentacion>(
            backendGestionTrabajoDeGrado(
                `sustentacion_proyecto_investigacion/listarInformacionCoordinador/${trabajoDeGradoId}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }
}
