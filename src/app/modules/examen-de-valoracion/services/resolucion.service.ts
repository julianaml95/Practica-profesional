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

    createResolucionDocente(resolucion: Resolucion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'generacion_resolucion/insertarInformacionDocente'
            ),
            resolucion,
            {
                headers: getHeaders(),
            }
        );
    }

    createResolucionCoordinadorFase1(resolucion: Resolucion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'generacion_resolucion/insertarInformacionCoordinadorFase1'
            ),
            resolucion,
            {
                headers: getHeaders(),
            }
        );
    }

    createResolucionCoordinadorFase2(resolucion: Resolucion) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'generacion_resolucion/insertarInformacionCoordinadorFase2'
            ),
            resolucion,
            {
                headers: getHeaders(),
            }
        );
    }

    // updateResolucion(resolucion: Resolucion, resolucionId: number) {
    //     return this.http.put<any>(
    //         backendGestionTrabajoDeGrado(
    //             `generacion_resolucion/${resolucionId}`
    //         ),
    //         resolucion,
    //         {
    //             headers: getHeaders(),
    //         }
    //     );
    // }

    getResolucionDocente(trabajoDeGradoId: number): Observable<any> {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `generacion_resolucion/listarInformacionDocente/${trabajoDeGradoId}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    getResolucionCoordinadorFase1(trabajoDeGradoId: number): Observable<any> {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `generacion_resolucion/listarInformacionCoordinadorFase1/${trabajoDeGradoId}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    getResolucionCoordinadorFase2(trabajoDeGradoId: number): Observable<any> {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `generacion_resolucion/listarInformacionCoordinadorFase2/${trabajoDeGradoId}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }
}
