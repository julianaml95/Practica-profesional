import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { backend } from 'src/app/core/constants/api-url';
import { getHeaders } from 'src/app/core/constants/header';
import { Curso } from '../models/curso';

@Injectable({
    providedIn: 'root',
})
export class CursoService {
    constructor(private http: HttpClient) {}

    getCurso(id: number) {
        return this.http.get<Curso>(backend(`curso/${id}`), {
            headers: getHeaders(),
        });
    }

    addCurso(curso: Curso) {
        return this.http.post<any>(backend('curso'), curso, {
            headers: getHeaders(),
        });
    }

    updateCurso(id: number, curso: Curso) {
        return this.http.put<any>(backend(`curso/${id}`), curso, {
            headers: getHeaders(),
        });
    }

    deleteCurso(id: number) {
        return this.http.delete<any>(backend(`curso/${id}`), {
            headers: getHeaders(),
        });
    }

    listCursos(): Observable<Curso[]> {
        return this.http.get<Curso[]>(backend('curso'), {
            headers: getHeaders(),
        });
    }
}
