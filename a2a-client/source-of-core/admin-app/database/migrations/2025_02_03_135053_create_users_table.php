<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('account_id')->index();
            $table->string('login', 25);
            $table->string('email', 50)->unique();
            $table->string('name', 25);
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->json('settings')->nullable();
            $table->boolean('owner')->default(false);
            $table->string('photo_path', 100)->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
//        Schema::dropIfExists('users');
    }
};
