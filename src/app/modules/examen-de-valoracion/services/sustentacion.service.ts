import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Sustentacion } from '../models/sustentacion';

@Injectable({
    providedIn: 'root',
})
export class SustentacionService {
    constructor(private http: HttpClient) {}

    createSustentacion(sustentacion: Sustentacion) {
        return this.http.post<any>(backend('sustentacion'), sustentacion, {
            headers: getHeaders(),
        });
    }

    updateSustentacion(sustentacion: Sustentacion, solicitudId: number) {
        return this.http.patch<any>(
            backend(`sustentacion/${solicitudId}`),
            sustentacion,
            {
                headers: getHeaders(),
            }
        );
    }

    getSustentacionBySolicitud(solicitudId: number): Observable<Sustentacion> {
        return this.http.get<Sustentacion>(
            backend(`sustentacion/${solicitudId}`),
            {
                headers: getHeaders(),
            }
        );
    }

    deleteSustentacion(solicitudId: number) {
        return this.http.delete<any>(backend(`sustentacion/${solicitudId}`), {
            headers: getHeaders(),
        });
    }
}
