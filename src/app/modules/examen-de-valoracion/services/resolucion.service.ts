import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Resolucion } from '../models/resolucion';

@Injectable({
    providedIn: 'root',
})
export class ResolucionService {
    constructor(private http: HttpClient) {}

    createResolucion(resolucion: Resolucion) {
        return this.http.post<any>(backend('resolucion'), resolucion, {
            headers: getHeaders(),
        });
    }

    updateResolucion(resolucion: Resolucion, solicitudId: number) {
        return this.http.patch<any>(
            backend(`resolucion/${solicitudId}`),
            resolucion,
            {
                headers: getHeaders(),
            }
        );
    }

    getResolucionBySolicitud(solicitudId: number): Observable<Resolucion> {
        return this.http.get<Resolucion>(backend(`resolucion/${solicitudId}`), {
            headers: getHeaders(),
        });
    }

    deleteResolucion(solicitudId: number) {
        return this.http.delete<any>(backend(`resolucion/${solicitudId}`), {
            headers: getHeaders(),
        });
    }
}
