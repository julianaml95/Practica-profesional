import { MenuItem } from "primeng/api";

export const menuItems: MenuItem[] = [
    {
        label: 'INICIO',
        icon: 'pi pi-fw pi-home',
        routerLink: '/'
    },
    {
        label: 'GESTIÓN',
        icon: 'pi pi-fw pi-user',
        items: [
            {
                label: 'ESTUDIANTES',
                icon: 'pi pi-user',
                routerLink: '/estudiantes',
            },
            {
                label: 'DOCENTES',
                icon: 'pi pi-user',
                routerLink: '/docentes',
            },
        ]
    },
    {
        label: 'MATRICULAS',
        icon: 'pi pi-fw pi-id-card',
    },
    {
        label: 'SOLICITUDES',
        icon: 'pi pi-fw pi-inbox',

    },
    {
        label: 'PRESUPUESTO',
        icon: 'pi pi-fw pi-chart-line'
    },
    { separator: true },
    {
        label: 'TRABAJOS DE GRADO',
        icon: 'pi pi-fw pi-book'
    }
];
