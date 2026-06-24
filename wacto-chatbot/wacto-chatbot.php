<?php
/*
Plugin Name: WACTO AI Chatbot
Description: WACTO Chatbot Widget
Version: 1.0
Author: WACTO
*/

if (!defined('ABSPATH')) {
    exit;
}

function wacto_enqueue_widget() {

    wp_enqueue_script(
        'wacto-widget',
        plugin_dir_url(__FILE__) . 'assets/widget.js',
        [],
        '1.0',
        true
    );
}

add_action('wp_enqueue_scripts', 'wacto_enqueue_widget');