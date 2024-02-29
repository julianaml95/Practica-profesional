import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Respuesta } from '../models/respuesta';

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

    updateRespuesta(respuesta: Respuesta, solicitudId: number) {
        return this.http.patch<any>(backend(`respuesta/${solicitudId}`), respuesta, {
            headers: getHeaders(),
        });
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

    getRespuesta(id: number) {
        return this.http.get<any>(backend(`respuesta/${id}`), {
            headers: getHeaders(),
        });
    }

    uploadFile(document: File, estudianteId: number, tipoDocumento: string) {
        const formData: FormData = new FormData();
        const headers = new HttpHeaders();
        headers.append('Content-Type', 'multipart/form-data');
        formData.append('document', document);
        formData.append('estudianteId', estudianteId.toString());
        formData.append('tipoDocumento', tipoDocumento);
        return this.http.post<any>(backend('files/upload'), formData, {
            headers: headers,
        });
    }

    getFile(estudianteId: number, tipoDocumento: string): Observable<any> {
        const params = new HttpParams()
            .set('estudianteId', estudianteId.toString())
            .set('tipoDocumento', tipoDocumento);

        return this.http.get(backend('files/download'), {
            params,
            observe: 'response',
            responseType: 'blob',
        });
    }

    deleteFile(estudianteId: number, tipoDocumento: string) {
        const params = new HttpParams()
            .set('estudianteId', estudianteId.toString())
            .set('tipoDocumento', tipoDocumento);

        return this.http.delete(backend('files/delete'), {
            params,
        });
    }
}
