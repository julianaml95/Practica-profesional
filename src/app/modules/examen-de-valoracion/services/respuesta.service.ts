import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Evaluacion, Respuesta } from '../models/respuesta';

@Injectable({
    providedIn: 'root',
})
export class RespuestaService {
    constructor(private http: HttpClient) {}

    createRespuesta(respuesta: Respuesta) {
        return this.http.post<any>(backend('respuesta'), respuesta, {
            headers: getHeaders(),
        });
    }

    getEvaluaciones(respuestaId: number) {
        return this.http.get<any>(
            backend(`respuesta/${respuestaId}/evaluaciones`),
            { headers: getHeaders() }
        );
    }

    createEvaluacion(evaluacion: Evaluacion, respuestaId: number) {
        return this.http.post<any>(
            backend(`respuesta/${respuestaId}/evaluaciones`),
            evaluacion,
            {
                headers: getHeaders(),
            }
        );
    }

    updateEvaluacion(evaluacion: Evaluacion, evaluacionId: number) {
        return this.http.patch<any>(
            backend(`evaluacion/${evaluacionId}`),
            evaluacion,
            {
                headers: getHeaders(),
            }
        );
    }

    deleteEvaluacion(respuestaId: number) {
        return this.http.delete<any>(backend(`evaluacion/${respuestaId}`), {
            headers: getHeaders(),
        });
    }

    updateRespuesta(respuesta: Respuesta, solicitudId: number) {
        return this.http.patch<any>(
            backend(`respuesta/${solicitudId}`),
            respuesta,
            {
                headers: getHeaders(),
            }
        );
    }

    getRespuestaBySolicitud(solicitudId: number): Observable<Respuesta> {
        return this.http.get<Respuesta>(backend(`respuesta`), {
            headers: getHeaders(),
            params: {
                solicitudId: solicitudId,
            },
        });
    }

    deleteRespuesta(solicitudId: number) {
        return this.http.delete<any>(backend(`respuesta/${solicitudId}`), {
            headers: getHeaders(),
        });
    }
}
