import { Component, OnInit } from '@angular/core';
import { Docente } from 'src/app/modules/gestion-docentes/models/docente';
import { DocenteService } from '../../services/docente.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Router } from '@angular/router';
import { mapResponseException } from 'src/app/core/utils/exception-util';
import { MessageService } from 'primeng/api';
import { errorMessage } from 'src/app/core/utils/message-util';

@Component({
    selector: 'app-buscador-docentes',
    templateUrl: './buscador-docentes.component.html',
    styleUrls: ['./buscador-docentes.component.scss'],
})
export class BuscadorDocentesComponent implements OnInit {
    docentes: Docente[];
    docenteSeleccionado: Docente;
    loading: boolean;

    constructor(
        private docenteService: DocenteService,
        private ref: DynamicDialogRef,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.listDocentes();
    }

    listDocentes() {
        this.loading = true;
        this.docenteService
            .listDocentes()
            .subscribe({
                next: (response) => (this.docentes = response),
                error: (error: any) => {
                    this.handlerResponseException(error);
                },
            })
            .add(() => (this.loading = false));

        this.docenteSeleccionado = null;
    }

    filterDocentes(filter: string) {
        if (filter?.trim().length > 0) {
            this.docenteService.listDocentes().subscribe({
                next: (response) => {
                    this.docentes = response.filter((e) =>
                        e.nombre.includes(filter.trim())
                    );
                },
                error: (error: any) => {
                    this.handlerResponseException(error);
                },
            });
        }
    }

    onCancel() {
        this.ref.close();
    }

    onSeleccionar() {
        if (this.docenteSeleccionado) {
            this.ref.close(this.docenteSeleccionado);
        }
    }

    onRegistrar() {
        this.ref.close();
        this.router.navigate(['docentes/registrar']);
    }

    handlerResponseException(response: any) {
        if (response.status != 501) return;
        const mapException = mapResponseException(response.error);
        mapException.forEach((value, _) => {
            this.messageService.add(errorMessage(value));
        });
    }
}
