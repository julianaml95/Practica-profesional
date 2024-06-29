import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { backendGestionTrabajoDeGrado } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Solicitud } from '../models/solicitud';

@Injectable({
    providedIn: 'root',
})
export class SolicitudService {
    constructor(private http: HttpClient) {}

    createSolicitudDocente(solicitud: Solicitud, idTrabajoGrado: number) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/insertarInformacionDocente/${idTrabajoGrado}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    createSolicitudCoordinadorFase1(solicitud: any, idTrabajoGrado: number) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/insertarInformacionCoordinadorFase1/${idTrabajoGrado}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    createSolicitudCoordinadorFase2(solicitud: any, idTrabajoGrado: number) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/insertarInformacionCoordinadorFase2/${idTrabajoGrado}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    getSolicitudDocente(idTrabajoGrado: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/listarInformacionDocente/${idTrabajoGrado}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    getSolicitudCoordinadorFase1(idTrabajoGrado: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/listarInformacionCoordinadorFase1/${idTrabajoGrado}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    getSolicitudCoordinadorFase2(idTrabajoGrado: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/listarInformacionCoordinadorFase2/${idTrabajoGrado}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    updateSolicitudDocente(solicitud: Solicitud, idTrabajoGrado: number) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/actualizarInformacionDocente/${idTrabajoGrado}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    updateSolicitudCoordinadorFase1(
        solicitud: Solicitud,
        idTrabajoGrado: number
    ) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/actualizarInformacionCoordinadorFase1/${idTrabajoGrado}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    updateSolicitudCoordinadorFase2(
        solicitud: Solicitud,
        idTrabajoGrado: number
    ) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/actualizarInformacionCoordinadorFase2/${idTrabajoGrado}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    getFile(rutaArchivo: string): Observable<any> {
        const params = new HttpParams().set('rutaArchivo', rutaArchivo);
        return this.http.get(
            backendGestionTrabajoDeGrado(
                'solicitud_examen_valoracion/descargarDocumento'
            ),
            { params, responseType: 'text' }
        );
    }
}
