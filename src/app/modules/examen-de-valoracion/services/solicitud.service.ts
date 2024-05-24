import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { backendGestionTrabajoDeGrado } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Solicitud } from '../models/solicitud';
import { Estudiante } from '../../gestion-estudiantes/models/estudiante';
import { Docente } from '../../gestion-docentes/models/docente';
import { Experto } from '../models/experto';

@Injectable({
    providedIn: 'root',
})
export class SolicitudService {
    constructor(private http: HttpClient) {}

    private estudianteSeleccionadoSubject = new BehaviorSubject<Estudiante>(
        null
    );
    private trabajoSeleccionadoSubject = new BehaviorSubject<any>(null);
    private sustentacionSeleccionadaSubject = new BehaviorSubject<any>(null);
    private resolucionSeleccionadaSubject = new BehaviorSubject<any>(null);
    private evaluacionSeleccionadaSubject = new BehaviorSubject<any>(null);
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

    trabajoSeleccionadoSubject$: Observable<any> =
        this.trabajoSeleccionadoSubject.asObservable();

    sustentacionSeleccionadaSubject$: Observable<any> =
        this.sustentacionSeleccionadaSubject.asObservable();

    resolucionSeleccionadaSubject$: Observable<any> =
        this.resolucionSeleccionadaSubject.asObservable();

    solicitudSeleccionadaSubject$: Observable<any> =
        this.solicitudSeleccionadaSubject.asObservable();

    respuestaSeleccionadaSubject$: Observable<any> =
        this.respuestaSeleccionadaSubject.asObservable();

    evaluacionSeleccionadaSubject$: Observable<any> =
        this.evaluacionSeleccionadaSubject.asObservable();

    tituloSeleccionadoSubject$: Observable<string> =
        this.tituloSeleccionadoSubject.asObservable();

    evaluadorInternoSeleccionadoSubject$: Observable<Docente> =
        this.evaluadorInternoSeleccionadoSubject.asObservable();

    evaluadorExternoSeleccionadoSubject$: Observable<Experto> =
        this.evaluadorExternoSeleccionadoSubject.asObservable();

    setEstudianteSeleccionado(estudiante: Estudiante) {
        this.estudianteSeleccionadoSubject.next(estudiante);
    }

    setTrabajoSeleccionado(sustentacion: any) {
        this.trabajoSeleccionadoSubject.next(sustentacion);
    }

    setSustentacionSeleccionada(sustentacion: any) {
        this.sustentacionSeleccionadaSubject.next(sustentacion);
    }

    setResolucionSeleccionada(resolucion: any) {
        this.resolucionSeleccionadaSubject.next(resolucion);
    }

    setSolicitudSeleccionada(solicitud: any) {
        this.solicitudSeleccionadaSubject.next(solicitud);
    }

    setRespuestaSeleccionada(respuesta: any) {
        this.respuestaSeleccionadaSubject.next(respuesta);
    }

    setEvaluacionSeleccionada(evaluacion: any) {
        this.evaluacionSeleccionadaSubject.next(evaluacion);
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

    getEstudiantes() {
        return this.http.get<Estudiante[]>(
            backendGestionTrabajoDeGrado(`inicio_trabajo_grado`),
            {
                headers: getHeaders(),
            }
        );
    }
    createTrabajoDeGrado(id: number) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(`inicio_trabajo_grado/${id}`),
            {
                headers: getHeaders(),
            }
        );
    }

    getTrabajoDeGrado(id: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `inicio_trabajo_grado/buscarTrabajoGrado/${id}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    listTrabajosDeGrado(id: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(`inicio_trabajo_grado/${id}`),
            {
                headers: getHeaders(),
            }
        );
    }

    deleteTrabajoDeGrado(id: number) {
        return this.http.delete<any>(
            backendGestionTrabajoDeGrado(`inicio_trabajo_grado/${id}`),
            {
                headers: getHeaders(),
            }
        );
    }

    createSolicitudDocente(solicitud: Solicitud) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'solicitud_examen_valoracion/insertarInformacionDocente'
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    createSolicitudCoordinador(solicitud: Solicitud) {
        return this.http.post<any>(
            backendGestionTrabajoDeGrado(
                'solicitud_examen_valoracion/insertarInformacionCoordinador'
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    getSolicitudDocente(id: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/listarInformacionDocente/${id}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    getSolicitudCoordinador(id: number) {
        return this.http.get<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/listarInformacionCoordinador/${id}`
            ),
            {
                headers: getHeaders(),
            }
        );
    }

    updateSolicitudDocente(solicitud: Solicitud, id: number) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/actualizarInformacionDocente/${id}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    updateSolicitudCoordinador(solicitud: Solicitud, id: number) {
        return this.http.put<any>(
            backendGestionTrabajoDeGrado(
                `solicitud_examen_valoracion/actualizarInformacionCoordinador/${id}`
            ),
            solicitud,
            {
                headers: getHeaders(),
            }
        );
    }

    getFile(rutaArchivo: string): Observable<any> {
        return this.http.post(
            backendGestionTrabajoDeGrado(
                'solicitud_examen_valoracion/descargarDocumento'
            ),
            { rutaArchivo },
            { responseType: 'text' }
        );
    }
}
