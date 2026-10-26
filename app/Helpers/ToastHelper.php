<?php

namespace App\Helpers;

class ToastHelper
{
    public static function success(string $message, string $title = 'Success')
    {
        session()->flash('toast', [
            'type' => 'success',
            'title' => $title,
            'message' => $message,
        ]);
    }

    public static function error(string $message, string $title = 'Error')
    {
        session()->flash('toast', [
            'type' => 'error',
            'title' => $title,
            'message' => $message,
        ]);
    }

    public static function warning(string $message, string $title = 'Warning')
    {
        session()->flash('toast', [
            'type' => 'warning',
            'title' => $title,
            'message' => $message,
        ]);
    }

    public static function info(string $message, string $title = 'Info')
    {
        session()->flash('toast', [
            'type' => 'info',
            'title' => $title,
            'message' => $message,
        ]);
    }
}