import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Solicitud } from '../models/solicitud';
import { Estudiante } from '../../gestion-estudiantes/models/estudiante';
import { FormGroup } from '@angular/forms';
import { Docente } from '../../gestion-docentes/models/docente';
import { Experto } from '../models/experto';
import { Respuesta } from '../models/respuesta';

@Injectable({
    providedIn: 'root',
})
export class SolicitudService {
    constructor(private http: HttpClient) {}

    private estudianteSeleccionadoSubject = new BehaviorSubject<Estudiante>(
        null
    );
    private respuestaSeleccionadaSubject = new BehaviorSubject<any>(null);
    private solicitudSeleccionadaSubject = new BehaviorSubject<any>(null);
    private tituloSeleccionadoSubject = new BehaviorSubject<string>(null);
    private evaluadorInternoSeleccionadoSubject = new BehaviorSubject<Docente>(
        null
    );
    private evaluadorExternoSeleccionadoSubject = new BehaviorSubject<Experto>(
        null
    );

    estudianteSeleccionado$: Observable<Estudiante> =
        this.estudianteSeleccionadoSubject.asObservable();

    solicitudSeleccionadaSubject$: Observable<any> =
        this.solicitudSeleccionadaSubject.asObservable();

    respuestaSeleccionadaSubject$: Observable<any> =
        this.respuestaSeleccionadaSubject.asObservable();

    tituloSeleccionadoSubject$: Observable<string> =
        this.tituloSeleccionadoSubject.asObservable();

    evaluadorInternoSeleccionadoSubject$: Observable<Docente> =
        this.evaluadorInternoSeleccionadoSubject.asObservable();

    evaluadorExternoSeleccionadoSubject$: Observable<Experto> =
        this.evaluadorExternoSeleccionadoSubject.asObservable();

    setEstudianteSeleccionado(estudiante: Estudiante) {
        this.estudianteSeleccionadoSubject.next(estudiante);
    }

    setSolicitudSeleccionada(solicitud: any) {
        this.solicitudSeleccionadaSubject.next(solicitud);
    }

    setRespuestaSeleccionada(respuesta: any) {
        this.respuestaSeleccionadaSubject.next(respuesta);
    }

    setTituloSeleccionadoSubject(titulo: string) {
        this.tituloSeleccionadoSubject.next(titulo);
    }

    setEvaluadorInternoSeleccionadoSubject(docente: Docente) {
        this.evaluadorInternoSeleccionadoSubject.next(docente);
    }
    setEvaluadorExternoSeleccionadoSubject(experto: Experto) {
        this.evaluadorExternoSeleccionadoSubject.next(experto);
    }

    createSolicitud(solicitud: Solicitud) {
        return this.http.post<any>(backend('solicitud'), solicitud, {
            headers: getHeaders(),
        });
    }

    updateSolicitud(solicitud: Solicitud, id: number) {
        return this.http.patch<any>(backend(`solicitud/${id}`), solicitud, {
            headers: getHeaders(),
        });
    }

    listSolicitudes(id: number): Observable<Solicitud[]> {
        return this.http.get<Solicitud[]>(backend(`solicitud`), {
            headers: getHeaders(),
            params: {
                estudianteId: id,
            },
        });
    }

    deleteSolicitud(id: number) {
        return this.http.delete<any>(backend(`solicitud/${id}`), {
            headers: getHeaders(),
        });
    }

    updateEstudiante(id: number, solicitud: Solicitud) {
        return this.http.put<any>(backend(`solicitud/${id}`), solicitud, {
            headers: getHeaders(),
        });
    }

    getSolicitud(id: number) {
        return this.http.get<any>(backend(`solicitud/${id}`), {
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
