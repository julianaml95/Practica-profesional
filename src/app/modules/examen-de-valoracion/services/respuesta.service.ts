import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backendGestionTrabajoDeGrado } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Respuesta } from '../models/respuesta';

@Injectable({
    providedIn: 'root',
})
export class RespuestaService {
    constructor(private http: HttpClient) {}

    createRespuestaExamen(respuesta: Respuesta, trabajoDeGradoId: number) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                `respuesta_examen_valoracion/${trabajoDeGradoId}`
            ),
            respuesta,
            {
                headers: getHeaders(),
            }
        );
    }

    updateRespuestaExamen(respuestaId: number, respuesta: Respuesta) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `respuesta_examen_valoracion/${respuestaId}`
            ),
            respuesta,
            {
                headers: getHeaders(),
            }
        );
    }

    deleteRespuestaExamen(respuestaId: number) {
        return this.http.delete<any>(
            backendGestionTrabajoDeGrado(
                `respuesta_examen_valoracion/${respuestaId}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    getRespuestasExamen(trabajoDeGradoId: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `respuesta_examen_valoracion/${trabajoDeGradoId}`
            ),
            { headers: getHeaders() }
        );
    }

    getFile(rutaArchivo: string): Observable<any> {
        return this.http.post(
            backendGestionTrabajoDeGrado(
                'respuesta_examen_valoracion/descargarDocumento'
            ),
            { rutaArchivo },
            { responseType: 'text' }
        );
    }
}
