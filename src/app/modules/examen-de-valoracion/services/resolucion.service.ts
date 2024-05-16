import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backendGestionTrabajoDeGrado } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Resolucion } from '../models/resolucion';

@Injectable({
    providedIn: 'root',
})
export class ResolucionService {
    constructor(private http: HttpClient) {}

    createResolucion(resolucion: Resolucion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado('generacion_resolucion'),
            resolucion,
            {
                headers: getHeaders(),
            }
        );
    }

    updateResolucion(resolucion: Resolucion, resolucionId: number) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `generacion_resolucion/${resolucionId}`
            ),
            resolucion,
            {
                headers: getHeaders(),
            }
        );
    }

    getResolucionByTrabajo(trabajoDeGradoId: number): Observable<Resolucion> {
        return this.http.get<Resolucion>(
            backendGestionTrabajoDeGrado(
                `generacion_resolucion/${trabajoDeGradoId}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }
}
