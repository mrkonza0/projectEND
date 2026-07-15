<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Project;
use App\Models\Researcher;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Default admin account
        User::create([
            'name'     => 'ภาศพงศ์ องค์ธนาวัฒน์',
            'email'    => 'admin@admin.com',
            'password' => Hash::make('password'),
            'faculty'  => 'วิทยาศาสตร์และเทคโนโลยี',
            'major'    => 'วิทยาการคอมพิวเตอร์',
            'position' => 'อาจารย์ประจำ',
            'phone'    => '055-123-456',
            'role'     => 'admin',
        ]);

        // Researchers
        foreach ([
            ['name' => 'ภาศพงศ์ องค์ธนาวัฒน์', 'faculty' => 'วิทยาศาสตร์และเทคโนโลยี',       'expertise' => 'วิทยาการคอมพิวเตอร์', 'email' => 'admin@uru.ac.th',    'phone' => '055-123-456'],
            ['name' => 'สมชาย ใจดี',            'faculty' => 'ครุศาสตร์',                      'expertise' => 'การศึกษาปฐมวัย',     'email' => 'somchai@uru.ac.th', 'phone' => '055-234-567'],
            ['name' => 'นารี สุขสงบ',            'faculty' => 'มนุษยศาสตร์และสังคมศาสตร์',     'expertise' => 'ภาษาถิ่น',           'email' => 'naree@uru.ac.th',   'phone' => '055-345-678'],
        ] as $r) {
            Researcher::create($r);
        }

        // Projects
        foreach ([
            ['title' => 'AI เพื่อการเกษตรอัจฉริยะ',                   'researcher' => 'ภาศพงศ์ องค์ธนาวัฒน์', 'budget' => '250000', 'year' => '2566', 'status' => 'กำลังดำเนินการ'],
            ['title' => 'การพัฒนาและอนุรักษ์ภาษาถิ่นเหนือ',           'researcher' => 'นารี สุขสงบ',           'budget' => '150000', 'year' => '2566', 'status' => 'เสร็จสิ้น'],
            ['title' => 'นวัตกรรมการเรียนรู้ปฐมวัยผ่านเทคโนโลยี',    'researcher' => 'สมชาย ใจดี',           'budget' => '180000', 'year' => '2567', 'status' => 'อนุมัติแล้ว'],
        ] as $p) {
            Project::create($p);
        }

        // Articles
        foreach ([
            ['title' => 'Machine Learning Applications in Thai Agriculture', 'author' => 'ภาศพงศ์ องค์ธนาวัฒน์', 'journal' => 'Thai Journal of Science and Technology', 'year' => '2566', 'status' => 'ตีพิมพ์แล้ว', 'cited' => 12],
            ['title' => 'การอนุรักษ์ภาษาถิ่นด้วยเทคโนโลยีดิจิทัล',   'author' => 'นารี สุขสงบ',           'journal' => 'วารสารมนุษยศาสตร์ มรอ.',              'year' => '2565', 'status' => 'ตีพิมพ์แล้ว', 'cited' => 5],
            ['title' => 'Active Learning in Early Childhood Education',     'author' => 'สมชาย ใจดี',           'journal' => 'Journal of Education Research',        'year' => '2566', 'status' => 'รอตีพิมพ์',   'cited' => 0],
        ] as $a) {
            Article::create($a);
        }
    }
}
