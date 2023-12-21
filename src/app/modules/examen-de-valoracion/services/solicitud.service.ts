import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Solicitud } from '../models/solicitud';

@Injectable({
    providedIn: 'root',
})
export class SolicitudService {
    constructor(private http: HttpClient) {}

    createSolicitud(solicitud: Solicitud) {
        return this.http.post<any>(backend('solicitud'), solicitud, {
            headers: getHeaders(),
        });
    }

    listSolicitudes(): Observable<Solicitud[]> {
        return this.http.get<Solicitud[]>(backend('solicitud'), {
            headers: getHeaders(),
        });
    }
}
